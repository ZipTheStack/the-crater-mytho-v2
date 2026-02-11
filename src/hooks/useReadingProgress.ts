import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useRef } from 'react';

export function useReadingProgress(bookId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProgress = useMutation({
    mutationFn: async ({ 
      chapterId, 
      scrollPosition 
    }: { 
      chapterId: string; 
      scrollPosition: number;
    }) => {
      if (!user?.id || !bookId) throw new Error('Not authenticated or no book');
      
      // Upsert reading progress
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          chapter_id: chapterId,
          scroll_position: scrollPosition,
          last_read_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,book_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', user?.id] });
    },
  });

  // Debounced save to avoid too many writes
  const debouncedSaveProgress = useCallback(
    (chapterId: string, scrollPosition: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        saveProgress.mutate({ chapterId, scrollPosition });
      }, 2000); // Save after 2 seconds of inactivity
    },
    [saveProgress]
  );

  // Immediate save (for chapter changes)
  const saveProgressNow = useCallback(
    (chapterId: string, scrollPosition: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      saveProgress.mutate({ chapterId, scrollPosition });
    },
    [saveProgress]
  );

  return {
    saveProgress: debouncedSaveProgress,
    saveProgressNow,
    isSaving: saveProgress.isPending,
  };
}
