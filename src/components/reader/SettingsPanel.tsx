import { useEffect, useRef } from 'react';
import { Moon, Sun, Minus, Plus, Lock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AudioControls } from './AudioControls';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPanelProps {
  theme: 'dark' | 'light' | 'sepia';
  setTheme: (theme: 'dark' | 'light' | 'sepia') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineWidth: 'narrow' | 'medium' | 'wide';
  setLineWidth: (width: 'narrow' | 'medium' | 'wide') => void;
  // Audio controls
  audiobookMode: boolean;
  setAudiobookMode: (mode: boolean) => void;
  ownsAudiobook: boolean;
  ownsSoundtrack: boolean;
  soundtrackPlaying: boolean;
  soundtrackVolume: number;
  onSoundtrackPlayPause: () => void;
  onSoundtrackVolumeChange: (v: number) => void;
  soundtrackTracks: Array<{ id: string; name: string }>;
  currentTrack: string;
  onTrackChange: (id: string) => void;
  onPurchaseAudiobook: () => void;
  onPurchaseSoundtrack: () => void;
  isOnline: boolean;
  audioCached: boolean;
  onClose: () => void;
  // Audio player state
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

export function SettingsPanel({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  lineWidth,
  setLineWidth,
  audiobookMode,
  setAudiobookMode,
  ownsAudiobook,
  ownsSoundtrack,
  soundtrackPlaying,
  soundtrackVolume,
  onSoundtrackPlayPause,
  onSoundtrackVolumeChange,
  soundtrackTracks,
  currentTrack,
  onTrackChange,
  onPurchaseAudiobook,
  onPurchaseSoundtrack,
  isOnline,
  audioCached,
  onClose,
  currentTime,
  duration,
  onSeek,
}: SettingsPanelProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on click outside (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isMobile]);

  // Close on scroll (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    const handleScroll = () => {
      onClose();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onClose, isMobile]);

  // Close after 5 seconds of idle (desktop only, extended time)
  useEffect(() => {
    if (isMobile) return;
    
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        onClose();
      }, 5000); // Extended to 5 seconds for better usability
    };

    // Initial timer
    resetIdleTimer();

    // Reset on activity within panel
    const panel = panelRef.current;
    if (panel) {
      panel.addEventListener('mousemove', resetIdleTimer);
      panel.addEventListener('touchstart', resetIdleTimer);
      panel.addEventListener('click', resetIdleTimer);
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (panel) {
        panel.removeEventListener('mousemove', resetIdleTimer);
        panel.removeEventListener('touchstart', resetIdleTimer);
        panel.removeEventListener('click', resetIdleTimer);
      }
    };
  }, [onClose, isMobile]);

  const getContainerClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'sepia':
        return 'bg-amber-100/90 border-amber-300 text-amber-900';
      default:
        return 'bg-card border-border text-foreground';
    }
  };

  const getButtonClasses = (isActive: boolean) => {
    if (isActive) {
      switch (theme) {
        case 'light':
          return 'bg-amber-700 text-white';
        case 'sepia':
          return 'bg-amber-800 text-white';
        default:
          return 'bg-primary text-primary-foreground';
      }
    }
    switch (theme) {
      case 'light':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'sepia':
        return 'bg-amber-200/80 text-amber-800 hover:bg-amber-300/80';
      default:
        return 'bg-muted text-foreground hover:bg-muted/80';
    }
  };

  const getMutedClasses = () => {
    switch (theme) {
      case 'light':
        return 'text-amber-700';
      case 'sepia':
        return 'text-amber-700';
      default:
        return 'text-muted-foreground';
    }
  };

  const settingsContent = (
    <div className="space-y-4">
      {/* Theme */}
      <div>
        <label className={`text-sm ${getMutedClasses()} mb-2 block`}>Theme</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 py-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses(theme === 'dark')}`}
            aria-label="Dark theme"
            aria-pressed={theme === 'dark'}
          >
            <Moon className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 py-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses(theme === 'light')}`}
            aria-label="Light theme"
            aria-pressed={theme === 'light'}
          >
            <Sun className="w-4 h-4 mx-auto" aria-hidden="true" />
          </button>
          <button
            onClick={() => setTheme('sepia')}
            className={`flex-1 py-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClasses(theme === 'sepia')}`}
            aria-label="Sepia theme"
            aria-pressed={theme === 'sepia'}
          >
            Sepia
          </button>
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className={`text-sm ${getMutedClasses()} mb-2 block`}>Font Size</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFontSize(Math.max(14, fontSize - 2))}
            className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 ${getButtonClasses(false)}`}
            aria-label="Decrease font size"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="flex-1 text-center" aria-live="polite">{fontSize}px</span>
          <button
            onClick={() => setFontSize(Math.min(28, fontSize + 2))}
            className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 ${getButtonClasses(false)}`}
            aria-label="Increase font size"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Line width */}
      <div>
        <label className={`text-sm ${getMutedClasses()} mb-2 block`}>Line Width</label>
        <div className="flex gap-2">
          {(['narrow', 'medium', 'wide'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`flex-1 py-2 rounded text-sm capitalize transition-colors focus:outline-none focus:ring-2 ${getButtonClasses(lineWidth === w)}`}
              aria-pressed={lineWidth === w}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Audiobook toggle */}
      <div className={`pt-4 border-t ${theme === 'dark' ? 'border-border' : 'border-amber-300/50'}`}>
        <label className={`text-sm ${getMutedClasses()} mb-2 block`}>Audiobook</label>
        {ownsAudiobook ? (
          <button
            onClick={() => setAudiobookMode(!audiobookMode)}
            className={`w-full py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 ${getButtonClasses(audiobookMode)}`}
            aria-pressed={audiobookMode}
          >
            {audiobookMode ? 'Switch to Text' : 'Switch to Audio'}
          </button>
        ) : (
          <button
            onClick={onPurchaseAudiobook}
            className={`w-full py-2 px-4 rounded flex items-center justify-center gap-2 border ${
              theme === 'dark' ? 'border-primary text-primary hover:bg-primary/10' : 'border-amber-700 text-amber-700 hover:bg-amber-100'
            } transition-colors focus:outline-none focus:ring-2`}
            aria-label="Purchase audiobook access"
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            Purchase Audiobook
          </button>
        )}
      </div>

      {/* Soundtrack Player */}
      <div className={`pt-4 border-t ${theme === 'dark' ? 'border-border' : 'border-amber-300/50'}`}>
        <label className={`text-sm ${getMutedClasses()} mb-2 block`}>Soundtrack</label>
        {!isOnline && !audioCached ? (
          <p className={`text-sm ${getMutedClasses()}`}>
            Audio unavailable offline
          </p>
        ) : (
          <AudioControls
            isPlaying={soundtrackPlaying}
            onPlayPause={onSoundtrackPlayPause}
            volume={soundtrackVolume}
            onVolumeChange={onSoundtrackVolumeChange}
            tracks={soundtrackTracks}
            currentTrack={currentTrack}
            onTrackChange={onTrackChange}
            isPurchased={ownsSoundtrack}
            onPurchase={onPurchaseSoundtrack}
            theme={theme}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
          />
        )}
      </div>
    </div>
  );

  // Mobile: Use bottom drawer
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className={getContainerClasses()}>
          <DrawerHeader className="flex items-center justify-between pb-2">
            <DrawerTitle className={theme === 'dark' ? 'text-foreground' : 'text-amber-900'}>
              Reading Settings
            </DrawerTitle>
            <DrawerClose asChild>
              <button 
                className={`p-1 rounded-full ${getButtonClasses(false)}`}
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <ScrollArea className="max-h-[70vh] px-4 pb-6">
            {settingsContent}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Keep floating panel
  return (
    <motion.div
      ref={panelRef}
      className={`fixed top-16 right-6 z-50 w-80 rounded-lg shadow-xl p-4 border ${getContainerClasses()}`}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      onClick={(e) => e.stopPropagation()}
    >
      {settingsContent}
    </motion.div>
  );
}
