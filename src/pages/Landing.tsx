import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GateAnimation } from '@/components/GateAnimation';
import { useGateSound } from '@/hooks/useGateSound';

export default function Landing() {
  const [gatesOpen, setGatesOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  const { playGateSound } = useGateSound();

  const handleEnter = useCallback(() => {
    // Prevent double-trigger during animation
    if (isAnimating || gatesOpen) return;
    
    setIsAnimating(true);
    // Small delay for anticipation before doors begin moving
    setTimeout(() => {
      setGatesOpen(true);
      playGateSound(); // Play stone grinding sound as doors open
    }, 150);
  }, [isAnimating, gatesOpen, playGateSound]);

  const handleGateComplete = () => {
    navigate('/auth');
  };

  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-background cursor-pointer select-none"
      onClick={handleEnter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleEnter();
        }
      }}
      aria-label="Enter The Crater Mythos"
    >
      {/* Dark void background behind doors */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle ambient glow from the center */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--flame-glow) / 0.08) 0%, transparent 50%)',
        }}
        animate={{
          opacity: gatesOpen ? 0 : [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: gatesOpen ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Center sigil hover zone - very subtle affordance */}
      <AnimatePresence>
        {!gatesOpen && !isAnimating && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-32 h-32 md:w-48 md:h-48 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Pulsing glow hint at the center seam */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(var(--flame-glow) / 0.2) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gate Animation - the doors themselves */}
      <GateAnimation isOpen={gatesOpen} onComplete={handleGateComplete} />

      {/* Very subtle "touch to enter" hint that fades quickly */}
      <AnimatePresence>
        {!gatesOpen && !isAnimating && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, delay: 3 }}
          >
            <motion.p
              className="text-xs text-muted-foreground/50 font-serif tracking-widest uppercase"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Touch to enter
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
