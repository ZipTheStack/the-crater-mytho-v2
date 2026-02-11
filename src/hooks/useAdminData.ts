import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalReaders: number;
  totalBooks: number;
  completionRate: number;
  deviceStats: { device: string; percent: number }[];
}

interface AdminBook {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  readers: number;
  cover_url: string | null;
  price_cents: number;
  preview_chapters: number;
}

interface AdminReader {
  id: string;
  email: string;
  name: string | null;
  progress: number;
  lastActive: string | null;
  hasPurchases: boolean;
}

interface AdminReferral {
  code: string;
  userName: string;
  signups: number;
  credits: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Get total unique readers
      const { data: readerRows, error: readersError } = await supabase
        .from('reading_progress')
        .select('user_id');

      if (readersError) throw readersError;
      const totalReaders = new Set(readerRows?.map(row => row.user_id)).size;

      // Get total books
      const { count: totalBooks } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true });

      // Get completion rate (users with progress_percent >= 90)
      const { data: progressData } = await supabase
        .from('reading_progress')
        .select('progress_percent');

      const completed = progressData?.filter(p => (p.progress_percent ?? 0) >= 90).length ?? 0;
      const total = progressData?.length ?? 1;
      const completionRate = Math.round((completed / total) * 100) || 0;

      // Device stats not available in new schema - show placeholder
      const deviceStats = [
        { device: 'Desktop', percent: 60 },
        { device: 'Mobile', percent: 30 },
        { device: 'Tablet', percent: 10 },
      ];

      return {
        totalReaders: totalReaders ?? 0,
        totalBooks: totalBooks ?? 0,
        completionRate,
        deviceStats,
      };
    },
    staleTime: 30000,
  });
}

export function useAdminBooks() {
  return useQuery({
    queryKey: ['admin-books'],
    queryFn: async (): Promise<AdminBook[]> => {
      const { data: books, error } = await supabase
        .from('books')
        .select('id, title, description, is_published, cover_url, price_cents, preview_chapters')
        .order('title', { ascending: true });

      if (error) throw error;

      // Get reader counts per book
      const bookWithReaders = await Promise.all(
        (books || []).map(async (book) => {
          const { count } = await supabase
            .from('reading_progress')
            .select('user_id', { count: 'exact', head: true })
            .eq('book_id', book.id);

          return {
            id: book.id,
            title: book.title,
            description: book.description,
            is_published: book.is_published ?? false,
            cover_url: book.cover_url,
            price_cents: book.price_cents ?? 0,
            preview_chapters: book.preview_chapters ?? 3,
            readers: count ?? 0,
          };
        })
      );

      return bookWithReaders;
    },
    staleTime: 30000,
  });
}

export function useAdminReaders() {
  return useQuery({
    queryKey: ['admin-readers'],
    queryFn: async (): Promise<AdminReader[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, name')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get progress and purchase status for each reader
      const readersWithProgress = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: progress } = await supabase
            .from('reading_progress')
            .select('progress_percent, last_read_at')
            .eq('user_id', profile.user_id)
            .order('last_read_at', { ascending: false })
            .limit(1)
            .single();

          const { count: purchaseCount } = await supabase
            .from('purchases')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.user_id);

          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            progress: Math.round(progress?.progress_percent ?? 0),
            lastActive: progress?.last_read_at ?? null,
            hasPurchases: (purchaseCount ?? 0) > 0,
          };
        })
      );

      return readersWithProgress;
    },
    staleTime: 30000,
  });
}

export function useAdminReferrals() {
  return useQuery({
    queryKey: ['admin-referrals'],
    queryFn: async (): Promise<AdminReferral[]> => {
      // Get profiles with referral codes
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('referral_code, name, email, referral_credits')
        .not('referral_code', 'is', null)
        .order('referral_credits', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Count signups per referral code
      const referralsWithCounts = await Promise.all(
        (profiles || []).filter(p => p.referral_code).map(async (profile) => {
          const { count } = await supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', profile.referral_code);

          return {
            code: profile.referral_code!,
            userName: profile.name || profile.email,
            signups: count ?? 0,
            credits: profile.referral_credits ?? 0,
          };
        })
      );

      return referralsWithCounts.filter(r => r.signups > 0 || r.credits > 0);
    },
    staleTime: 30000,
  });
}

export function useAdminDropOffPoints() {
  return useQuery({
    queryKey: ['admin-dropoff'],
    queryFn: async () => {
      // Get reading progress grouped by last chapter
      const { data } = await supabase
        .from('reading_progress')
        .select(`
          chapter_id,
          chapters (title, chapter_order)
        `)
        .lt('progress_percent', 90);

      // Count drop-offs per chapter
      const chapterCounts: Record<string, { title: string; count: number }> = {};
      data?.forEach(item => {
        const chapter = item.chapters as any;
        if (chapter?.title) {
          const key = chapter.title;
          if (!chapterCounts[key]) {
            chapterCounts[key] = { title: key, count: 0 };
          }
          chapterCounts[key].count++;
        }
      });

      const total = data?.length || 1;
      return Object.values(chapterCounts)
        .map(c => ({ chapter: c.title, percent: Math.round((c.count / total) * 100) }))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5);
    },
    staleTime: 60000,
  });
}
