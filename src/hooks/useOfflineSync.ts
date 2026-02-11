import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  initOfflineDB, 
  getPendingActions, 
  deletePendingAction,
  hasBookCached,
  hasAudioCached,
} from '@/lib/offlineStorage';

export function useOfflineSync(bookId?: string) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasCachedContent, setHasCachedContent] = useState(false);
  const [hasAudioCachedState, setHasAudioCachedState] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check cached content for current book
  useEffect(() => {
    async function checkCache() {
      if (!bookId || !user?.id) return;
      
      await initOfflineDB();
      const hasCached = await hasBookCached(bookId, user.id);
      const hasAudio = await hasAudioCached(bookId);
      
      setHasCachedContent(hasCached);
      setHasAudioCachedState(hasAudio);
    }
    
    checkCache();
  }, [bookId, user?.id]);

  // Sync pending actions when coming back online
  const syncPendingActions = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const pending = await getPendingActions();
      
      for (const action of pending) {
        try {
          switch (action.type) {
            case 'progress': {
              const progressData = action.data as {
                user_id: string;
                book_id: string;
                chapter_id?: string;
                progress_percent?: number;
                total_time_seconds?: number;
                last_read_at?: string;
              };
              const { error } = await supabase
                .from('reading_progress')
                .upsert(progressData, {
                  onConflict: 'user_id,book_id',
                });
              if (!error) await deletePendingAction(action.id);
              break;
            }
            case 'bookmark': {
              const bookmarkData = action.data as {
                chapter_id: string;
                position: number;
                user_id: string;
                note?: string;
              };
              const { error } = await supabase
                .from('bookmarks')
                .upsert(bookmarkData);
              if (!error) await deletePendingAction(action.id);
              break;
            }
            case 'highlight': {
              const highlightData = action.data as {
                chapter_id: string;
                user_id: string;
                text_content: string;
                start_position: number;
                end_position: number;
                color?: string;
                note?: string;
              };
              const { error } = await supabase
                .from('highlights')
                .upsert(highlightData);
              if (!error) await deletePendingAction(action.id);
              break;
            }
          }
        } catch (err) {
          console.error('Failed to sync action:', action.id, err);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Sync on mount if online
    if (navigator.onLine) {
      syncPendingActions();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions]);

  return {
    isOnline,
    hasCachedContent,
    hasAudioCached: hasAudioCachedState,
    isSyncing,
    syncNow: syncPendingActions,
  };
}
