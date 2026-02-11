import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface PaywallModalProps {
  theme: 'dark' | 'light' | 'sepia';
  onPurchase: () => void;
  onSubscribe: () => void;
}

export function PaywallModal({ theme, onPurchase, onSubscribe }: PaywallModalProps) {
  const getContainerClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-50/95 border-amber-200 text-amber-900';
      case 'sepia':
        return 'bg-amber-100/95 border-amber-300 text-amber-900';
      default:
        return 'bg-card border-border text-foreground';
    }
  };

  const getLockClasses = () => {
    switch (theme) {
      case 'light':
        return 'text-amber-700';
      case 'sepia':
        return 'text-amber-800';
      default:
        return 'text-primary';
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

  const getPrimaryButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-amber-700 text-white hover:bg-amber-800';
      case 'sepia':
        return 'bg-amber-800 text-white hover:bg-amber-900';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  const getSecondaryButtonClasses = () => {
    switch (theme) {
      case 'light':
        return 'border-amber-700 text-amber-700 hover:bg-amber-100';
      case 'sepia':
        return 'border-amber-800 text-amber-800 hover:bg-amber-200/50';
      default:
        return 'border-primary text-primary hover:bg-primary/10';
    }
  };

  return (
    <motion.div
      className={`mt-12 p-8 rounded-lg text-center border ${getContainerClasses()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Lock className={`w-12 h-12 mx-auto mb-4 ${getLockClasses()}`} aria-hidden="true" />
      <h2 className="text-xl font-serif mb-2">Continue Reading</h2>
      <p className={`mb-6 ${getMutedClasses()}`}>
        You've reached the end of the preview. Purchase this book or subscribe to continue.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onPurchase}
          className={`px-6 py-2 border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getSecondaryButtonClasses()}`}
        >
          Purchase Book
        </button>
        <button
          onClick={onSubscribe}
          className={`px-6 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getPrimaryButtonClasses()}`}
        >
          Subscribe
        </button>
      </div>
    </motion.div>
  );
}
