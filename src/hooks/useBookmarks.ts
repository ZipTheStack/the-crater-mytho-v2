import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useBookmarkMutations(bookId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addBookmark = useMutation({
    mutationFn: async ({ chapterId, position, note }: { chapterId: string; position: number; note?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          chapter_id: chapterId,
          position,
          note,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      toast.success('Bookmark added');
    },
    onError: () => {
      toast.error('Failed to add bookmark');
    },
  });

  const removeBookmark = useMutation({
    mutationFn: async ({ chapterId }: { chapterId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      toast.success('Bookmark removed');
    },
    onError: () => {
      toast.error('Failed to remove bookmark');
    },
  });

  return { addBookmark, removeBookmark };
}

export function useUserBookmarks() {
  const { user } = useAuth();

  return useQueryClient().fetchQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          position,
          note,
          created_at,
          chapter_id,
          chapters (
            title,
            chapter_order,
            book_id,
            books (
              title
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}
