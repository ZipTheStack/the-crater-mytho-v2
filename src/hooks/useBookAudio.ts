import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AudioTrack {
  id: string;
  name: string;
  url: string;
}

interface BookAudioData {
  soundtrackTracks: AudioTrack[];
  audiobookTracks: AudioTrack[];
  isLoading: boolean;
}

export function useBookAudio(bookId: string | undefined): BookAudioData {
  const { data, isLoading } = useQuery({
    queryKey: ['book-audio', bookId],
    queryFn: async () => {
      if (!bookId) return { soundtrack: [], audiobook: [] };

      const { data: audioData, error } = await supabase
        .from('book_audio')
        .select('id, title, file_url, type, sort_order')
        .eq('book_id', bookId)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching book audio:', error);
        return { soundtrack: [], audiobook: [] };
      }

      const soundtrack: AudioTrack[] = [];
      const audiobook: AudioTrack[] = [];

      for (const track of audioData || []) {
        const formatted = {
          id: track.id,
          name: track.title,
          url: track.file_url,
        };

        if (track.type === 'soundtrack') {
          soundtrack.push(formatted);
        } else if (track.type === 'audiobook') {
          audiobook.push(formatted);
        }
      }

      return { soundtrack, audiobook };
    },
    enabled: !!bookId,
  });

  return {
    soundtrackTracks: data?.soundtrack || [],
    audiobookTracks: data?.audiobook || [],
    isLoading,
  };
}
