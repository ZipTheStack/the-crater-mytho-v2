import { useRef, useCallback } from 'react';
import gateSoundFile from '@/assets/gate-sound.wav';

export function useGateSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  const playGateSound = useCallback(() => {
    // Prevent double-trigger
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    try {
      audioRef.current = new Audio(gateSoundFile);
      audioRef.current.volume = 0.3; // Subtle volume
      audioRef.current.play().catch((error) => {
        // Fail silently - sound is optional enhancement
        console.warn('Gate sound playback failed:', error);
      });
    } catch (error) {
      // Fail silently - sound is optional enhancement
      console.warn('Gate sound initialization failed:', error);
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { playGateSound, stopSound };
}
