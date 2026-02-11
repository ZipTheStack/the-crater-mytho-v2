import { Play, Pause, Volume2, Lock } from 'lucide-react';

interface AudioControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  tracks: Array<{ id: string; name: string }>;
  currentTrack: string;
  onTrackChange: (id: string) => void;
  isPurchased: boolean;
  onPurchase: () => void;
  theme: 'dark' | 'light' | 'sepia';
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function AudioControls({
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
  tracks,
  currentTrack,
  onTrackChange,
  isPurchased,
  onPurchase,
  theme,
  currentTime = 0,
  duration = 0,
  onSeek,
}: AudioControlsProps) {
  const getButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-100 text-amber-900 hover:bg-amber-200 focus:ring-amber-500';
      case 'sepia':
        return 'bg-amber-200/80 text-amber-900 hover:bg-amber-300/80 focus:ring-amber-600';
      default:
        return 'bg-muted text-foreground hover:bg-muted/80 focus:ring-primary';
    }
  };

  const getSliderClasses = () => {
    switch (theme) {
      case 'light':
        return 'accent-amber-700';
      case 'sepia':
        return 'accent-amber-800';
      default:
        return 'accent-primary';
    }
  };

  const getSelectClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500';
      case 'sepia':
        return 'bg-amber-100 text-amber-900 border-amber-400 focus:ring-amber-600';
      default:
        return 'bg-muted text-foreground border-border focus:ring-primary';
    }
  };

  const getPurchaseButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'border-amber-700 text-amber-700 hover:bg-amber-100';
      case 'sepia':
        return 'border-amber-800 text-amber-800 hover:bg-amber-200/50';
      default:
        return 'border-primary text-primary hover:bg-primary/10';
    }
  };

  const getProgressClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-200';
      case 'sepia':
        return 'bg-amber-300/60';
      default:
        return 'bg-muted';
    }
  };

  const getProgressFillClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-600';
      case 'sepia':
        return 'bg-amber-700';
      default:
        return 'bg-primary';
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    onSeek(percentage * duration);
  };

  const currentTrackName = tracks.find(t => t.id === currentTrack)?.name;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // No tracks available
  if (tracks.length === 0) {
    return (
      <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-amber-600'}`}>
        No soundtrack available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isPurchased ? (
        <>
          {/* Current track name */}
          {currentTrackName && (
            <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-foreground' : 'text-amber-900'}`}>
              {currentTrackName}
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div
              className={`h-2 rounded-full cursor-pointer ${getProgressClasses()}`}
              onClick={handleProgressClick}
              role="slider"
              aria-label="Audio progress"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
              tabIndex={0}
            >
              <div
                className={`h-full rounded-full transition-all ${getProgressFillClasses()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-amber-600'}`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Play/Pause + Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayPause}
              className={`p-2 rounded-full ${getButtonClasses()} 
                focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
              aria-label={isPlaying ? 'Pause soundtrack' : 'Play soundtrack'}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Volume Slider */}
            <label className="sr-only" htmlFor="soundtrack-volume">Volume</label>
            <input
              id="soundtrack-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer
                         focus:outline-none focus:ring-2 ${getSliderClasses()}`}
              aria-valuetext={`Volume ${Math.round(volume * 100)}%`}
            />

            <Volume2 
              className={`w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-amber-600'}`} 
              aria-hidden="true" 
            />
          </div>

          {/* Track Selection */}
          {tracks.length > 1 && (
            <div>
              <label htmlFor="track-select" className="sr-only">Select track</label>
              <select
                id="track-select"
                value={currentTrack}
                onChange={(e) => onTrackChange(e.target.value)}
                className={`w-full p-2 rounded border 
                           focus:outline-none focus:ring-2 ${getSelectClasses()}`}
                aria-label="Select soundtrack track"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : (
        <button
          onClick={onPurchase}
          className={`w-full py-2 px-4 rounded flex items-center justify-center gap-2
                      border transition-colors
                      focus:outline-none focus:ring-2 focus:ring-offset-2 ${getPurchaseButtonClasses()}`}
          aria-label="Purchase soundtrack access"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          Purchase Soundtrack
        </button>
      )}
    </div>
  );
}
