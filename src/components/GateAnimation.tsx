import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import gateLeft from '@/assets/gate-left.jpg';
import gateRight from '@/assets/gate-right.jpg';

interface GateAnimationProps {
  isOpen: boolean;
  onComplete?: () => void;
}

export const GateAnimation = forwardRef<HTMLDivElement, GateAnimationProps>(
  function GateAnimation({ isOpen, onComplete }, ref) {
    // Heavy, ceremonial easing - slow start, steady movement, gentle settle
    const gateEasing = "easeInOut";

    return (
      <div ref={ref} className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        {/* Left Gate */}
        <motion.div
          className="absolute top-0 left-0 w-1/2 h-full"
          style={{
            backgroundImage: `url(${gateLeft})`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
          }}
          initial={{ x: 0 }}
          animate={{ x: isOpen ? '-100%' : 0 }}
          transition={{
            duration: 4,
            ease: gateEasing,
            delay: isOpen ? 0.2 : 0,
          }}
          onAnimationComplete={() => {
            if (isOpen && onComplete) onComplete();
          }}
        >
          {/* Inner edge shadow - adds depth at the seam */}
          <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black/60 to-transparent" />
          
          {/* Grinding light effect at the seam during opening */}
          {isOpen && (
            <motion.div
              className="absolute right-0 top-0 h-full w-1"
              style={{
                background: 'linear-gradient(to right, transparent, hsl(var(--flame-glow) / 0.4), hsl(var(--flame-glow) / 0.8))',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.3, 0.6, 0.2] }}
              transition={{ duration: 3, times: [0, 0.2, 0.5, 0.7, 1] }}
            />
          )}
        </motion.div>

        {/* Right Gate */}
        <motion.div
          className="absolute top-0 right-0 w-1/2 h-full"
          style={{
            backgroundImage: `url(${gateRight})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
          }}
          initial={{ x: 0 }}
          animate={{ x: isOpen ? '100%' : 0 }}
          transition={{
            duration: 4,
            ease: gateEasing,
            delay: isOpen ? 0.2 : 0,
          }}
        >
          {/* Inner edge shadow - adds depth at the seam */}
          <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-black/60 to-transparent" />
          
          {/* Grinding light effect at the seam during opening */}
          {isOpen && (
            <motion.div
              className="absolute left-0 top-0 h-full w-1"
              style={{
                background: 'linear-gradient(to left, transparent, hsl(var(--flame-glow) / 0.4), hsl(var(--flame-glow) / 0.8))',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.3, 0.6, 0.2] }}
              transition={{ duration: 3, times: [0, 0.2, 0.5, 0.7, 1] }}
            />
          )}
        </motion.div>

        {/* Dust particles during opening */}
        {isOpen && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  left: `${45 + Math.random() * 10}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: `hsl(var(--flame-glow) / ${0.3 + Math.random() * 0.4})`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.5, 0.5],
                  x: (Math.random() - 0.5) * 200,
                  y: -50 - Math.random() * 100,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: 0.5 + Math.random() * 1.5,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Ambient light reveal from behind doors */}
        {isOpen && (
          <motion.div
            className="absolute inset-0 -z-10"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(var(--flame-glow) / 0.15) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
        )}
      </div>
    );
  }
);
