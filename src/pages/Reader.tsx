import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useBookChapters } from '@/hooks/useBooks';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useBookmarkMutations } from '@/hooks/useBookmarks';
import { useSubscription } from '@/hooks/useSubscription';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useBookAudio } from '@/hooks/useBookAudio';
import { useContentProtection } from '@/hooks/useContentProtection';
import { useAuth } from '@/contexts/AuthContext';
import { cacheChapters } from '@/lib/offlineStorage';
import { PriceKey } from '@/hooks/usePricing';
import { Loader2 } from 'lucide-react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Settings, 
  Bookmark,
  Maximize,
  Eye,
  EyeOff,
} from 'lucide-react';

// Extracted components
import { SettingsPanel } from '@/components/reader/SettingsPanel';
import { PaywallModal } from '@/components/reader/PaywallModal';
import { SubscriptionModal, BookPurchaseModal, AudioPurchaseModal } from '@/components/reader/PurchaseModals';

export default function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isIdle } = useIdleTimer(3000);
  const { data: bookData, isLoading } = useBookChapters(bookId);
  const { saveProgress, saveProgressNow } = useReadingProgress(bookId);
  const { addBookmark, removeBookmark } = useBookmarkMutations(bookId);
  const { createCheckout, isInnerCircle } = useSubscription();
  const { isOnline, hasCachedContent, hasAudioCached } = useOfflineSync(bookId);
  
  // Content protection - prevents copying, printing, screenshots
  const { isWindowBlurred } = useContentProtection(true);
  
  // Reading state
  const [currentChapter, setCurrentChapter] = useState(0);
  const [pureMode, setPureMode] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [fontSize, setFontSize] = useState(18);
  const [lineWidth, setLineWidth] = useState<'narrow' | 'medium' | 'wide'>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [dogEars, setDogEars] = useState<string[]>([]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [readerPreviewMode, setReaderPreviewMode] = useState(false); // Admin toggle to simulate reader experience

  // Audio state
  const [audiobookMode, setAudiobookMode] = useState(false);
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);
  
  // Fetch real audio tracks from database
  const { soundtrackTracks, audiobookTracks, isLoading: isAudioLoading } = useBookAudio(bookId);
  
  const {
    isPlaying: soundtrackPlaying,
    volume: soundtrackVolume,
    currentTrackId,
    currentTime,
    duration,
    togglePlayPause: onSoundtrackPlayPause,
    changeVolume: onSoundtrackVolumeChange,
    changeTrack: onTrackChange,
    seek: onSeek,
  } = useAudioPlayer({ 
    tracks: soundtrackTracks, 
    pureMode 
  });

  // Modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showBookPurchaseModal, setShowBookPurchaseModal] = useState(false);
  const [showAudioPurchaseModal, setShowAudioPurchaseModal] = useState<'audiobook' | 'soundtrack' | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Resume from saved progress
  useEffect(() => {
    if (bookData?.progress?.chapter_id && bookData.chapters) {
      const savedIndex = bookData.chapters.findIndex(c => c.id === bookData.progress?.chapter_id);
      if (savedIndex >= 0) {
        setCurrentChapter(savedIndex);
      }
    }
  }, [bookData?.progress, bookData?.chapters]);

  // Load bookmarks
  useEffect(() => {
    if (bookData?.bookmarks) {
      setDogEars(bookData.bookmarks);
    }
  }, [bookData?.bookmarks]);

  // Cache chapters for offline reading (encrypted with user ID)
  useEffect(() => {
    if (bookData?.chapters && bookData.chapters.length > 0 && user?.id) {
      cacheChapters(
        bookData.chapters.map(c => ({
          id: c.id,
          book_id: bookId || '',
          content: c.content,
          title: c.title,
          chapter_order: c.chapter_order,
        })),
        user.id
      ).catch(console.error);
    }
  }, [bookData?.chapters, bookId, user?.id]);

  // Save progress on chapter change
  useEffect(() => {
    if (bookData?.chapters && bookData.chapters[currentChapter]) {
      const chapter = bookData.chapters[currentChapter];
      const progress = (currentChapter + 1) / bookData.chapters.length;
      saveProgress(chapter.id, progress);
    }
  }, [currentChapter, bookData?.chapters, saveProgress]);

  // Pure Mode: stop soundtrack when entering
  const enterPureMode = useCallback(() => {
    // Stop soundtrack immediately per addendum requirement
    if (soundtrackPlaying) {
      onSoundtrackPlayPause();
    }
    setPureMode(true);
  }, [soundtrackPlaying, onSoundtrackPlayPause]);

  // Escape key to exit pure mode
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pureMode) {
        setPureMode(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [pureMode]);

  const handleTap = useCallback(() => {
    if (window.innerWidth < 768) {
      setControlsVisible(prev => !prev);
    }
  }, []);

  const showControls = !pureMode && (controlsVisible || !isIdle);

  const toggleBookmark = () => {
    const chapter = bookData?.chapters?.[currentChapter];
    if (!chapter) return;

    if (dogEars.includes(chapter.id)) {
      removeBookmark.mutate({ chapterId: chapter.id });
      setDogEars(prev => prev.filter(id => id !== chapter.id));
    } else {
      addBookmark.mutate({ chapterId: chapter.id, position: 0 });
      setDogEars(prev => [...prev, chapter.id]);
    }
  };

  const handleChapterChange = useCallback((newIndex: number) => {
    const chapter = bookData?.chapters?.[currentChapter];
    if (chapter) {
      const progress = (currentChapter + 1) / (bookData?.chapters?.length || 1);
      saveProgressNow(chapter.id, progress);
    }
    setCurrentChapter(newIndex);
    // Scroll to top when changing chapters
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [bookData?.chapters, currentChapter, saveProgressNow]);

  // Swipe gesture handlers
  const goToNextChapter = useCallback(() => {
    if (bookData?.chapters && currentChapter < bookData.chapters.length - 1) {
      handleChapterChange(currentChapter + 1);
    }
  }, [bookData?.chapters, currentChapter, handleChapterChange]);

  const goToPrevChapter = useCallback(() => {
    if (currentChapter > 0) {
      handleChapterChange(currentChapter - 1);
    }
  }, [currentChapter, handleChapterChange]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextChapter,
    onSwipeRight: goToPrevChapter,
    threshold: 75,
    allowedTime: 400,
  });

  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return 'light-reading';
      case 'sepia':
        return 'sepia-reading';
      default:
        return '';
    }
  };

  const getLineWidthClass = () => {
    switch (lineWidth) {
      case 'narrow': return 'max-w-lg';
      case 'wide': return 'max-w-3xl';
      default: return 'max-w-2xl';
    }
  };

  const dashboardRoute = isAdmin ? '/admin' : '/dashboard';

  // Purchase handlers
  const handlePurchaseBook = async (priceType: PriceKey) => {
    setIsCheckingOut(true);
    try {
      await createCheckout(priceType, bookId);
    } finally {
      setIsCheckingOut(false);
      setShowBookPurchaseModal(false);
    }
  };

  const handleSubscribe = async (priceType: PriceKey) => {
    setIsCheckingOut(true);
    try {
      await createCheckout(priceType);
    } finally {
      setIsCheckingOut(false);
      setShowSubscriptionModal(false);
    }
  };

  const handlePurchaseAudio = async () => {
    setIsCheckingOut(true);
    try {
      // For now, audio is included with book extras or Inner Circle
      await createCheckout('book_extras', bookId);
    } finally {
      setIsCheckingOut(false);
      setShowAudioPurchaseModal(null);
    }
  };

  // Ownership checks - admins have full access unless in preview mode
  const effectiveHasAudio = readerPreviewMode ? false : (bookData?.hasAudio ?? false);
  const effectiveIsInnerCircle = readerPreviewMode ? false : isInnerCircle;
  const ownsAudiobook = bookData?.owned && effectiveHasAudio;
  const ownsSoundtrack = effectiveIsInnerCircle || ownsAudiobook;

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center ${getThemeClasses()}`}>
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-serif">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!bookData?.chapters || bookData.chapters.length === 0) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center ${getThemeClasses()}`}>
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-display mb-4">No Content Available</h1>
          <p className="text-muted-foreground mb-6">
            {bookData?.owned 
              ? "This book doesn't have any chapters yet."
              : "Preview chapters are not available for this book."}
          </p>
          <button
            onClick={() => navigate(dashboardRoute)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const chapters = bookData.chapters;
  const chapter = chapters[currentChapter];
  const currentChapterId = chapter?.id;
  const isBookmarked = currentChapterId ? dogEars.includes(currentChapterId) : false;
  const isAtPaywall = !bookData.owned && currentChapter >= chapters.length - 1 && chapters.length < (bookData.allChaptersCount || 0);

  const parseContent = (content: string | null) => {
    if (!content) return [];
    const paragraphs = content.split(/\n\n|\r\n\r\n/).filter(p => p.trim());
    return paragraphs.length > 0 ? paragraphs : [content];
  };

  const paragraphs = parseContent(chapter?.content);

  return (
    <div 
      className={`min-h-screen transition-colors duration-500 bg-background text-foreground ${getThemeClasses()}`}
      onClick={handleTap}
      onCopy={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
      {...swipeHandlers}
    >
      {/* Screenshot deterrence overlay - shows when window loses focus */}
      <AnimatePresence>
        {isWindowBlurred && (
          <motion.div
            className="screenshot-deterrent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-destructive/90 text-center py-1 text-sm z-50 text-destructive-foreground">
          Reading offline - changes will sync when connected
        </div>
      )}

      {/* Top controls */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            className={`fixed ${!isOnline ? 'top-7' : 'top-0'} left-0 right-0 z-40 px-6 py-4 bg-gradient-to-b from-background/90 to-transparent`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(dashboardRoute); }}
                className="p-2 hover:bg-muted rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Return to dashboard"
              >
                <Home className="w-5 h-5 text-muted-foreground" />
              </button>

              <span className="text-sm text-muted-foreground font-serif">
                {chapter?.title}
              </span>

              <div className="flex items-center gap-2">
                {/* Admin preview toggle */}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setReaderPreviewMode(!readerPreviewMode); }}
                    className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      readerPreviewMode 
                        ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    title={readerPreviewMode ? 'Exit Reader Preview (viewing as customer)' : 'Preview as Reader (see what customers see)'}
                    aria-label={readerPreviewMode ? 'Exit reader preview mode' : 'Enter reader preview mode'}
                    aria-pressed={readerPreviewMode}
                  >
                    {readerPreviewMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                  className="p-2 hover:bg-muted rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Open settings"
                  aria-expanded={showSettings}
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); enterPureMode(); }}
                  className="p-2 hover:bg-muted rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Pure Mode - Press Escape to exit"
                  aria-label="Enter Pure Mode"
                >
                  <Maximize className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && !pureMode && (
          <SettingsPanel
            theme={theme}
            setTheme={setTheme}
            fontSize={fontSize}
            setFontSize={setFontSize}
            lineWidth={lineWidth}
            setLineWidth={setLineWidth}
            audiobookMode={audiobookMode}
            setAudiobookMode={setAudiobookMode}
            ownsAudiobook={ownsAudiobook || false}
            ownsSoundtrack={ownsSoundtrack}
            soundtrackPlaying={soundtrackPlaying}
            soundtrackVolume={soundtrackVolume}
            onSoundtrackPlayPause={onSoundtrackPlayPause}
            onSoundtrackVolumeChange={onSoundtrackVolumeChange}
            soundtrackTracks={soundtrackTracks.map(t => ({ id: t.id, name: t.name }))}
            currentTrack={currentTrackId}
            onTrackChange={onTrackChange}
            onPurchaseAudiobook={() => setShowAudioPurchaseModal('audiobook')}
            onPurchaseSoundtrack={() => setShowAudioPurchaseModal('soundtrack')}
            isOnline={isOnline}
            audioCached={hasAudioCached}
            onClose={() => setShowSettings(false)}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        )}
      </AnimatePresence>

      {/* Pure mode exit - screen reader accessible */}
      {pureMode && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setPureMode(false); }}
            className="fixed top-4 right-4 z-50 p-2 opacity-0 hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Exit Pure Mode"
          >
            <span className="text-xs text-muted-foreground">Exit Pure Mode</span>
          </button>
          {audiobookMode && (
            <div className="sr-only" aria-live="polite">
              Audiobook playing in pure mode. Press Escape to exit.
            </div>
          )}
        </>
      )}

      {/* Main content */}
      <main 
        className={`min-h-screen px-6 py-24 mx-auto ${getLineWidthClass()}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {/* Dog ear indicator */}
        {isBookmarked && (
          <div className="fixed top-0 right-0 w-12 h-12 z-30">
            <div className="absolute inset-0 bg-gradient-to-bl from-primary/80 to-transparent" 
                 style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
          </div>
        )}

        {/* Chapter title */}
        <motion.h1
          key={currentChapter}
          className="text-2xl md:text-3xl font-display text-center mb-12 tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {chapter?.title}
        </motion.h1>

        {/* Paragraphs */}
        {paragraphs.map((para, index) => (
          <motion.p
            key={index}
            className="reading-text mb-6 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}
          >
            {para}
          </motion.p>
        ))}

        {/* Paywall */}
        {isAtPaywall && (
          <PaywallModal
            theme={theme}
            onPurchase={() => setShowBookPurchaseModal(true)}
            onSubscribe={() => setShowSubscriptionModal(true)}
          />
        )}
      </main>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.footer
            className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 bg-gradient-to-t from-background/90 to-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <button
                onClick={(e) => { e.stopPropagation(); handleChapterChange(Math.max(0, currentChapter - 1)); }}
                disabled={currentChapter === 0}
                className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Previous chapter"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
                  className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  aria-pressed={isBookmarked}
                >
                  <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
                <div className="text-sm text-muted-foreground" aria-live="polite">
                  {currentChapter + 1} / {chapters.length}
                  {!bookData.owned && chapters.length < (bookData.allChaptersCount || 0) && (
                    <span className="text-xs ml-1">(preview)</span>
                  )}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleChapterChange(Math.min(chapters.length - 1, currentChapter + 1)); }}
                disabled={currentChapter === chapters.length - 1}
                className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Next chapter"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="max-w-4xl mx-auto mt-4">
              <div className="progress-subtle" role="progressbar" aria-valuenow={currentChapter + 1} aria-valuemin={1} aria-valuemax={chapters.length}>
                <div 
                  className="progress-subtle-bar"
                  style={{ width: `${((currentChapter + 1) / chapters.length) * 100}%` }}
                />
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Purchase Modals */}
      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={handleSubscribe}
          isLoading={isCheckingOut}
          theme={theme}
        />
      )}

      {showBookPurchaseModal && (
        <BookPurchaseModal
          bookId={bookId || ''}
          bookTitle={chapter?.title || 'Book'}
          onClose={() => setShowBookPurchaseModal(false)}
          onPurchase={handlePurchaseBook}
          isLoading={isCheckingOut}
          theme={theme}
        />
      )}

      {showAudioPurchaseModal && (
        <AudioPurchaseModal
          type={showAudioPurchaseModal}
          bookTitle={chapter?.title || 'Book'}
          onClose={() => setShowAudioPurchaseModal(null)}
          onPurchase={handlePurchaseAudio}
          isLoading={isCheckingOut}
          theme={theme}
        />
      )}
    </div>
  );
}
