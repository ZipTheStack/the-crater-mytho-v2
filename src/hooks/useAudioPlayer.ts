import { useState, useRef, useEffect, useCallback } from 'react';

interface Track {
  id: string;
  name: string;
  url: string;
}

interface UseAudioPlayerOptions {
  tracks: Track[];
  onTimeUpdate?: (currentTime: number) => void;
  pureMode?: boolean;
}

export function useAudioPlayer({ tracks, onTimeUpdate, pureMode }: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTrackId, setCurrentTrackId] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Update currentTrackId when tracks array changes (handles dynamic loading)
  useEffect(() => {
    if (tracks.length > 0 && !currentTrackId) {
      setCurrentTrackId(tracks[0].id);
    } else if (tracks.length > 0 && !tracks.find(t => t.id === currentTrackId)) {
      // Current track no longer exists, switch to first
      setCurrentTrackId(tracks[0].id);
    }
  }, [tracks, currentTrackId]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      // Play next track if available
      const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
      if (currentIndex < tracks.length - 1) {
        setCurrentTrackId(tracks[currentIndex + 1].id);
      } else {
        setIsPlaying(false);
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [tracks, onTimeUpdate]);

  // Load track when it changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    const track = tracks.find(t => t.id === currentTrackId);
    if (track) {
      audioRef.current.src = track.url;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrackId, tracks]);

  // Handle pure mode - stop soundtrack when entering pure mode
  useEffect(() => {
    if (pureMode && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [pureMode, isPlaying]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(console.error);
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeTrack = useCallback((trackId: string) => {
    setCurrentTrackId(trackId);
  }, []);

  const changeVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  return {
    isPlaying,
    volume,
    currentTrackId,
    currentTime,
    duration,
    play,
    pause,
    togglePlayPause,
    seek,
    changeTrack,
    changeVolume,
    currentTrack: tracks.find(t => t.id === currentTrackId),
  };
}
