import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReaderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readerId: string | null;
  readerEmail: string;
}

export function ReaderDetailsModal({ open, onOpenChange, readerId, readerEmail }: ReaderDetailsModalProps) {
  const { data: readerData, isLoading } = useQuery({
    queryKey: ['reader-details', readerId],
    queryFn: async () => {
      if (!readerId) return null;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', readerId)
        .single();

      // Get reading progress
      const { data: progress } = await supabase
        .from('reading_progress')
        .select(`
          progress_percent,
          last_read_at,
          books (title)
        `)
        .eq('user_id', profile?.user_id || '');

      // Get purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select(`
          purchased_at,
          amount_cents,
          books (title)
        `)
        .eq('user_id', profile?.user_id || '');

      // Get bookmarks count
      const { count: bookmarksCount } = await supabase
        .from('bookmarks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile?.user_id || '');

      // Get highlights count
      const { count: highlightsCount } = await supabase
        .from('highlights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile?.user_id || '');

      return {
        profile,
        progress,
        purchases,
        bookmarksCount: bookmarksCount || 0,
        highlightsCount: highlightsCount || 0,
      };
    },
    enabled: open && !!readerId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Reader Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : readerData ? (
          <div className="space-y-6">
            {/* Profile info */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Profile</h4>
              <div className="bg-muted p-4 rounded space-y-2">
                <p><span className="text-muted-foreground">Email:</span> {readerData.profile?.email}</p>
                <p><span className="text-muted-foreground">Name:</span> {readerData.profile?.name || 'Not set'}</p>
                <p><span className="text-muted-foreground">Referral Code:</span> <span className="font-mono">{readerData.profile?.referral_code}</span></p>
                <p><span className="text-muted-foreground">Referral Credits:</span> ${((readerData.profile?.referral_credits || 0) / 100).toFixed(2)}</p>
              </div>
            </div>

            {/* Reading stats */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Engagement</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded text-center">
                  <p className="text-2xl font-serif">{readerData.bookmarksCount}</p>
                  <p className="text-sm text-muted-foreground">Bookmarks</p>
                </div>
                <div className="bg-muted p-4 rounded text-center">
                  <p className="text-2xl font-serif">{readerData.highlightsCount}</p>
                  <p className="text-sm text-muted-foreground">Highlights</p>
                </div>
              </div>
            </div>

            {/* Reading progress */}
            {readerData.progress && readerData.progress.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Reading Progress</h4>
                <div className="space-y-2">
                  {readerData.progress.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-muted p-3 rounded">
                      <span>{(p.books as any)?.title || 'Unknown book'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-background rounded overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.round(p.progress_percent || 0)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(p.progress_percent || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchases */}
            {readerData.purchases && readerData.purchases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Purchases</h4>
                <div className="space-y-2">
                  {readerData.purchases.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-muted p-3 rounded">
                      <span>{(p.books as any)?.title || 'Unknown book'}</span>
                      <span className="text-sm text-muted-foreground">
                        {p.purchased_at ? formatDistanceToNow(new Date(p.purchased_at), { addSuffix: true }) : 'Unknown date'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No data found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
