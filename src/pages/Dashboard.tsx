import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useBooks, BookWithProgress } from '@/hooks/useBooks';
import { useSubscription } from '@/hooks/useSubscription';
import { PriceKey } from '@/hooks/usePricing';
import { SubscriptionModal, BookPurchaseModal } from '@/components/reader/PurchaseModals';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Gift, 
  Settings, 
  Headphones, 
  Music, 
  Bookmark,
  ChevronRight,
  Copy,
  Lock,
  CreditCard,
  Loader2,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DogEar {
  id: string;
  bookId: string;
  bookTitle: string;
  chapter: string;
  excerpt: string;
  chapterId: string;
}

export default function Dashboard() {
  const { user, profile, logout, refreshSubscription } = useAuth();
  const { data: books, isLoading: booksLoading } = useBooks();
  const { createCheckout, openCustomerPortal, hasActiveSubscription, subscriptionTier, isInnerCircle } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [dogEars, setDogEars] = useState<DogEar[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showBookPurchaseModal, setShowBookPurchaseModal] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Handle success/cancel URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const type = searchParams.get('type');

    if (success === 'true') {
      toast.success(type === 'subscription' ? 'Subscription activated!' : 'Purchase complete!');
      refreshSubscription();
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (canceled === 'true') {
      toast.info('Purchase canceled');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams, refreshSubscription]);

  // Fetch user's bookmarks/dog-ears
  useEffect(() => {
    async function fetchDogEars() {
      if (!user?.id) return;

      const { data } = await supabase
        .from('bookmarks')
        .select(`
          id,
          chapter_id,
          note,
          chapters (
            title,
            content,
            books (title)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        // Also get the book_id from chapters
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, book_id')
          .in('id', data.map(b => b.chapter_id));

        const bookIdMap = new Map(chaptersData?.map(c => [c.id, c.book_id]) || []);

        setDogEars(data.map(b => ({
          id: b.id,
          bookId: bookIdMap.get(b.chapter_id) || '',
          bookTitle: (b.chapters as any)?.books?.title ?? 'Unknown',
          chapter: (b.chapters as any)?.title ?? 'Unknown Chapter',
          excerpt: b.note || ((b.chapters as any)?.content?.substring(0, 100) + '...') || '',
          chapterId: b.chapter_id,
        })));
      }
    }

    fetchDogEars();
  }, [user?.id]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${profile?.referral_code}`);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handlePurchaseBook = async (bookId: string, priceKey: PriceKey) => {
    setIsCheckingOut(true);
    try {
      await createCheckout(priceKey, bookId);
    } finally {
      setIsCheckingOut(false);
      setShowBookPurchaseModal(null);
    }
  };

  const handleSubscribe = async (priceKey: PriceKey) => {
    setIsCheckingOut(true);
    try {
      await createCheckout(priceKey);
    } finally {
      setIsCheckingOut(false);
      setShowSubscriptionModal(false);
    }
  };

  const currentBook = books?.find(b => b.progress > 0 && b.progress < 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="display-text text-lg text-primary">The Crater Mythos</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-serif">{profile?.name || user?.email}</span>
            <button 
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Subscription Status Banner */}
        {!hasActiveSubscription && (
          <motion.div
            className="mb-8 p-4 bg-primary/10 border border-primary/30 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-primary">Unlock the full Mythos experience</p>
                <p className="text-sm text-muted-foreground">Subscribe for unlimited access to all books and exclusive content</p>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Subscribe
              </button>
            </div>
          </motion.div>
        )}

        {hasActiveSubscription && (
          <motion.div
            className="mb-8 p-4 bg-card border border-primary/50 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-serif">{isInnerCircle ? 'Inner Circle' : 'Mythos Reader'}</span>
              </div>
              <button
                onClick={openCustomerPortal}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </motion.div>
        )}

        {/* Resume reading */}
        {currentBook && (
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => navigate('/reader/' + currentBook.id)}
              className="w-full p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-all group text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Continue reading</p>
                  <h2 className="text-xl font-serif mb-2">{currentBook.title}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${currentBook.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{currentBook.progress}%</span>
                  </div>
                </div>
                <BookOpen className="w-8 h-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </motion.section>
        )}

        {/* Books */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Your Library
          </h2>
          {booksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : books && books.length > 0 ? (
            <div className="grid gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onRead={() => navigate('/reader/' + book.id)}
                  onPreview={() => navigate('/reader/' + book.id)}
                  onPurchase={() => setShowBookPurchaseModal(book.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 bg-card border border-border rounded-lg text-center">
              <p className="text-muted-foreground">No books available yet. Check back soon!</p>
            </div>
          )}
        </motion.section>

        {/* Audio section */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Audio Experience
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <AudioCard
              title="Original Soundtrack"
              description="Ambient music for immersive reading"
              purchased={isInnerCircle}
              icon={<Music className="w-5 h-5" />}
            />
            <AudioCard
              title="Audiobook"
              description="Professionally narrated edition"
              purchased={false}
              icon={<Headphones className="w-5 h-5" />}
            />
          </div>
        </motion.section>

        {/* Dog-eared pages */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Saved Pages
          </h2>
          {dogEars.length > 0 ? (
            <div className="space-y-3">
              {dogEars.map((dogEar) => (
                <DogEarCard 
                  key={dogEar.id} 
                  dogEar={dogEar} 
                  onNavigate={() => navigate(`/reader/${dogEar.bookId}`)}
                  onDelete={async () => {
                    await supabase.from('bookmarks').delete().eq('id', dogEar.id);
                    setDogEars(prev => prev.filter(d => d.id !== dogEar.id));
                    toast.success('Bookmark deleted');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-card border border-border rounded-lg text-center">
              <p className="text-muted-foreground text-sm">No saved pages yet. Bookmark pages while reading!</p>
            </div>
          )}
        </motion.section>

        {/* Referral & Settings row */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Referral */}
          <div className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-primary" />
              <h3 className="font-serif">Referrals</h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Share your link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono truncate">
                  {window.location.origin}?ref={profile?.referral_code}
                </code>
                <button
                  onClick={handleCopyReferral}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedReferral && (
                <p className="text-xs text-primary mt-1">Copied!</p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits earned</span>
              <span className="text-primary font-serif">${((profile?.referral_credits || 0) / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Settings */}
          <div className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-serif">Preferences</h3>
            </div>
            <div className="space-y-3">
              <PreferenceItem label="Reading theme" value="Dark" />
              <PreferenceItem label="Font size" value="18px" />
              <PreferenceItem label="Line width" value="Medium" />
              <PreferenceItem 
                label="Subscription" 
                value={hasActiveSubscription ? (isInnerCircle ? 'Inner Circle' : 'Reader') : 'None'} 
              />
            </div>
            {hasActiveSubscription && (
              <button
                onClick={openCustomerPortal}
                className="mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded transition-colors"
              >
                Manage Subscription
              </button>
            )}
          </div>
        </motion.div>
      </main>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={handleSubscribe}
          isLoading={isCheckingOut}
        />
      )}

      {/* Book Purchase Modal */}
      {showBookPurchaseModal && (
        <BookPurchaseModal
          bookId={showBookPurchaseModal}
          bookTitle={books?.find(b => b.id === showBookPurchaseModal)?.title || 'Book'}
          onClose={() => setShowBookPurchaseModal(null)}
          onPurchase={(priceType) => handlePurchaseBook(showBookPurchaseModal, priceType)}
          isLoading={isCheckingOut}
        />
      )}
    </div>
  );
}

function BookCard({
  book,
  onRead,
  onPreview,
  onPurchase
}: {
  book: BookWithProgress;
  onRead: () => void;
  onPreview: () => void;
  onPurchase: () => void;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-12 h-16 object-cover rounded"
          />
        )}
        <div>
          <h3 className="font-serif">{book.title}</h3>
          {book.owned ? (
            book.progress > 0 && (
              <p className="text-sm text-muted-foreground">{book.progress}% complete</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Preview available
            </p>
          )}
        </div>
      </div>
      {book.owned ? (
        <button
          onClick={onRead}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm transition-colors hover:bg-primary/90"
        >
          Read
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="px-4 py-2 rounded text-sm transition-colors border border-muted-foreground/50 text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            Preview
          </button>
          <button
            onClick={onPurchase}
            className="px-4 py-2 rounded text-sm transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Purchase
          </button>
        </div>
      )}
    </div>
  );
}

function AudioCard({ 
  title, 
  description, 
  purchased, 
  icon 
}: { 
  title: string; 
  description: string; 
  purchased: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-primary">{icon}</div>
          <div>
            <h4 className="font-serif">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {purchased ? (
          <span className="text-xs text-primary">Included</span>
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function DogEarCard({ 
  dogEar, 
  onNavigate, 
  onDelete 
}: { 
  dogEar: DogEar; 
  onNavigate: () => void;
  onDelete: () => void;
}) {
  return (
    <div 
      className="p-4 bg-card border border-border rounded-lg relative dog-ear group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onNavigate}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm text-muted-foreground">{dogEar.bookTitle}</p>
          <p className="text-xs text-muted-foreground">{dogEar.chapter}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
            title="Delete bookmark"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <p className="text-sm font-serif italic text-foreground/80 line-clamp-2">{dogEar.excerpt}</p>
    </div>
  );
}

function PreferenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
