import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  preview_chapters: number;
  is_published: boolean;
  published_at: string | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export interface BookWithProgress extends Book {
  owned: boolean;
  hasAudio: boolean;
  progress: number;
  lastReadAt: string | null;
}

export function useBooks() {
  const { user, subscriptionStatus, isAdmin } = useAuth();
  const hasActiveSubscription = subscriptionStatus?.subscribed ?? false;

  return useQuery({
    queryKey: ['books', user?.id, hasActiveSubscription, isAdmin],
    queryFn: async (): Promise<BookWithProgress[]> => {
      // Fetch all published books
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (booksError) throw booksError;
      if (!books) return [];

      // If user is not logged in, return books with no ownership
      if (!user?.id) {
        return books.map(book => ({
          ...book,
          owned: false,
          hasAudio: false,
          progress: 0,
          lastReadAt: null,
        }));
      }

      // Fetch user's book purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('book_id')
        .eq('user_id', user.id);

      // Fetch user's audio purchases
      const { data: audioPurchases } = await supabase
        .from('audio_purchases')
        .select('audio_id');

      // Fetch user's reading progress
      const { data: progressData } = await supabase
        .from('reading_progress')
        .select('book_id, progress_percent, last_read_at')
        .eq('user_id', user.id);

      // Map purchases and progress
      const purchaseSet = new Set(purchases?.map(p => p.book_id) ?? []);
      const audioSet = new Set(audioPurchases?.map(p => p.audio_id) ?? []);
      const progressMap = new Map(progressData?.map(p => [p.book_id, {
        progress: p.progress_percent ?? 0,
        lastReadAt: p.last_read_at
      }]) ?? []);

      return books.map(book => {
        const purchased = purchaseSet.has(book.id);
        const bookProgress = progressMap.get(book.id);

        return {
          ...book,
          owned: purchased || hasActiveSubscription || isAdmin,
          hasAudio: audioSet.size > 0 || isAdmin,
          progress: Math.round(Number(bookProgress?.progress ?? 0)),
          lastReadAt: bookProgress?.lastReadAt ?? null,
        };
      });
    },
    enabled: true,
  });
}

export function useBookChapters(bookId: string | undefined) {
  const { user, subscriptionStatus, isAdmin } = useAuth();
  const hasActiveSubscription = subscriptionStatus?.subscribed ?? false;

  return useQuery({
    queryKey: ['chapters', bookId, user?.id, hasActiveSubscription, isAdmin],
    queryFn: async () => {
      if (!bookId) return { chapters: [], owned: false, hasAudio: false, progress: null, bookmarks: [], allChaptersCount: 0 };

      // Admins always have access
      let owned = hasActiveSubscription || isAdmin;
      let hasAudio = isAdmin; // Admins get all audio by default

      if (user?.id) {
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .single();

        if (purchase) {
          owned = true;
        }

        // Check for audio purchases for this book
        const { data: bookAudio } = await supabase
          .from('book_audio')
          .select('id')
          .eq('book_id', bookId);

        if (bookAudio && bookAudio.length > 0) {
          const audioIds = bookAudio.map(a => a.id);
          const { data: audioPurchases } = await supabase
            .from('audio_purchases')
            .select('audio_id')
            .eq('user_id', user.id)
            .in('audio_id', audioIds);

          hasAudio = hasAudio || (audioPurchases && audioPurchases.length > 0);
        }
      }

      // Fetch chapters
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_order', { ascending: true });

      if (error) throw error;

      // If not owned, filter to preview chapters only
      const accessibleChapters = owned
        ? chapters
        : chapters?.filter(c => c.is_preview);

      // Fetch reading progress
      let progress = null;
      if (user?.id) {
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .single();

        progress = progressData;
      }

      // Fetch bookmarks
      let bookmarks: string[] = [];
      if (user?.id) {
        const { data: bookmarkData } = await supabase
          .from('bookmarks')
          .select('chapter_id')
          .eq('user_id', user.id);

        bookmarks = bookmarkData?.map(b => b.chapter_id) ?? [];
      }

      return {
        chapters: accessibleChapters ?? [],
        allChaptersCount: chapters?.length ?? 0,
        owned,
        hasAudio,
        progress,
        bookmarks,
      };
    },
    enabled: !!bookId,
  });
}
