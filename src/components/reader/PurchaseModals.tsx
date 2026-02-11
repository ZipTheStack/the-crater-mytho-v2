import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { usePricingTiers, formatPrice, PriceKey } from '@/hooks/usePricing';
import { useState } from 'react';

// Re-export PriceKey for convenience
export type { PriceKey };

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: (priceKey: PriceKey) => void;
  isLoading: boolean;
  theme?: 'dark' | 'light' | 'sepia';
}

export function SubscriptionModal({
  onClose,
  onSubscribe,
  isLoading,
  theme = 'dark',
}: SubscriptionModalProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const { tiers, isLoading: pricesLoading } = usePricingTiers();

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-card' : 'bg-amber-50';
  const borderClass = isDark ? 'border-border' : 'border-amber-200';
  const textClass = isDark ? 'text-foreground' : 'text-amber-900';
  const mutedClass = isDark ? 'text-muted-foreground' : 'text-amber-700';
  const primaryBg = isDark ? 'bg-primary text-primary-foreground' : 'bg-amber-700 text-white';
  const secondaryBorder = isDark ? 'border-primary text-primary hover:bg-primary/10' : 'border-amber-700 text-amber-700 hover:bg-amber-100';

  // Get prices for current billing interval
  const readerPrice = billingInterval === 'monthly' ? tiers.reader.monthly : tiers.reader.yearly;
  const innerCirclePrice = billingInterval === 'monthly' ? tiers.inner_circle.monthly : tiers.inner_circle.yearly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        className={`w-full max-w-2xl ${bgClass} border ${borderClass} rounded-lg p-6 ${textClass}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif">Choose Your Plan</h2>
          <button
            onClick={onClose}
            className={`${mutedClass} hover:${textClass} focus:outline-none`}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {pricesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Billing toggle */}
            <div className="flex justify-center mb-6">
              <div className={`flex ${isDark ? 'bg-muted' : 'bg-amber-100'} p-1 rounded-lg`}>
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    billingInterval === 'monthly'
                      ? (isDark ? 'bg-background text-foreground' : 'bg-white text-amber-900')
                      : mutedClass
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    billingInterval === 'yearly'
                      ? (isDark ? 'bg-background text-foreground' : 'bg-white text-amber-900')
                      : mutedClass
                  }`}
                >
                  Yearly (Save 17%)
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Reader tier */}
              <div className={`p-6 border ${borderClass} rounded-lg`}>
                <h3 className="font-serif text-lg mb-2">{tiers.reader.name}</h3>
                <p className="text-3xl font-serif mb-4">
                  {readerPrice ? formatPrice(readerPrice.amount_cents) : '--'}
                  <span className={`text-sm ${mutedClass}`}>/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {(readerPrice?.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={isDark ? 'text-primary' : 'text-amber-700'}>✓</span>
                      <span className={mutedClass}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onSubscribe(billingInterval === 'monthly' ? 'reader_monthly' : 'reader_yearly')}
                  disabled={isLoading || !readerPrice}
                  className={`w-full py-2 border rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${secondaryBorder}`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Subscribe'}
                </button>
              </div>

              {/* Inner Circle tier */}
              <div className={`p-6 border-2 ${isDark ? 'border-primary' : 'border-amber-700'} rounded-lg relative`}>
                <div className={`absolute -top-3 left-4 ${primaryBg} px-2 py-0.5 text-xs rounded`}>
                  Recommended
                </div>
                <h3 className="font-serif text-lg mb-2">{tiers.inner_circle.name}</h3>
                <p className="text-3xl font-serif mb-4">
                  {innerCirclePrice ? formatPrice(innerCirclePrice.amount_cents) : '--'}
                  <span className={`text-sm ${mutedClass}`}>/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  {(innerCirclePrice?.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={isDark ? 'text-primary' : 'text-amber-700'}>✓</span>
                      <span className={mutedClass}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onSubscribe(billingInterval === 'monthly' ? 'inner_circle_monthly' : 'inner_circle_yearly')}
                  disabled={isLoading || !innerCirclePrice}
                  className={`w-full py-2 rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${primaryBg} hover:opacity-90`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Subscribe'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

interface BookPurchaseModalProps {
  bookId: string;
  bookTitle: string;
  onClose: () => void;
  onPurchase: (priceKey: PriceKey) => void;
  isLoading: boolean;
  theme?: 'dark' | 'light' | 'sepia';
}

export function BookPurchaseModal({
  bookTitle,
  onClose,
  onPurchase,
  isLoading,
  theme = 'dark',
}: BookPurchaseModalProps) {
  const { bookPrices, isLoading: pricesLoading } = usePricingTiers();

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-card' : 'bg-amber-50';
  const borderClass = isDark ? 'border-border' : 'border-amber-200';
  const textClass = isDark ? 'text-foreground' : 'text-amber-900';
  const mutedClass = isDark ? 'text-muted-foreground' : 'text-amber-700';
  const primaryBg = isDark ? 'bg-primary text-primary-foreground' : 'bg-amber-700 text-white';
  const secondaryBorder = isDark ? 'border-primary text-primary hover:bg-primary/10' : 'border-amber-700 text-amber-700 hover:bg-amber-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        className={`w-full max-w-md ${bgClass} border ${borderClass} rounded-lg p-6 ${textClass}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif">Purchase {bookTitle}</h2>
          <button
            onClick={onClose}
            className={`${mutedClass} hover:${textClass} focus:outline-none`}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {pricesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Digital Only */}
            <div className={`p-4 border ${borderClass} rounded-lg`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-serif">{bookPrices.digital?.display_name || 'Digital Access'}</h3>
                <span className="text-lg font-serif">
                  {bookPrices.digital ? formatPrice(bookPrices.digital.amount_cents) : '--'}
                </span>
              </div>
              <p className={`text-sm ${mutedClass} mb-4`}>
                {bookPrices.digital?.description || 'Full digital reading access'}
              </p>
              <button
                onClick={() => onPurchase('book_digital')}
                disabled={isLoading || !bookPrices.digital}
                className={`w-full py-2 border rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${secondaryBorder}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Purchase'}
              </button>
            </div>

            {/* Digital + Extras */}
            <div className={`p-4 border-2 ${isDark ? 'border-primary' : 'border-amber-700'} rounded-lg relative`}>
              <div className={`absolute -top-3 left-4 ${primaryBg} px-2 py-0.5 text-xs rounded`}>
                Best Value
              </div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-serif">{bookPrices.extras?.display_name || 'Digital + Extras'}</h3>
                <span className="text-lg font-serif">
                  {bookPrices.extras ? formatPrice(bookPrices.extras.amount_cents) : '--'}
                </span>
              </div>
              <p className={`text-sm ${mutedClass} mb-4`}>
                {bookPrices.extras?.description || 'Includes bonus material and extras'}
              </p>
              <button
                onClick={() => onPurchase('book_extras')}
                disabled={isLoading || !bookPrices.extras}
                className={`w-full py-2 rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${primaryBg} hover:opacity-90`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Purchase'}
              </button>
            </div>
          </div>
        )}

        <p className={`text-xs ${mutedClass} text-center mt-4`}>
          Or subscribe for unlimited access to all books
        </p>
      </motion.div>
    </div>
  );
}

interface AudioPurchaseModalProps {
  type: 'audiobook' | 'soundtrack';
  bookTitle: string;
  onClose: () => void;
  onPurchase: () => void;
  isLoading: boolean;
  theme?: 'dark' | 'light' | 'sepia';
}

export function AudioPurchaseModal({
  type,
  bookTitle,
  onClose,
  onPurchase,
  isLoading,
  theme = 'dark',
}: AudioPurchaseModalProps) {
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-card' : 'bg-amber-50';
  const borderClass = isDark ? 'border-border' : 'border-amber-200';
  const textClass = isDark ? 'text-foreground' : 'text-amber-900';
  const mutedClass = isDark ? 'text-muted-foreground' : 'text-amber-700';
  const primaryBg = isDark ? 'bg-primary text-primary-foreground' : 'bg-amber-700 text-white';

  const title = type === 'audiobook' ? 'Audiobook' : 'Original Soundtrack';
  const price = type === 'audiobook' ? '24.99' : '14.99';
  const description = type === 'audiobook' 
    ? 'Full professionally narrated audiobook for this title.'
    : 'Ambient music composed specifically for immersive reading.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        className={`w-full max-w-sm ${bgClass} border ${borderClass} rounded-lg p-6 ${textClass}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif">{title}</h2>
          <button 
            onClick={onClose} 
            className={`${mutedClass} hover:${textClass} focus:outline-none`}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <p className={`text-sm ${mutedClass} mb-2`}>{bookTitle}</p>
        <p className="text-3xl font-serif mb-4">${price}</p>
        <p className={`text-sm ${mutedClass} mb-6`}>{description}</p>

        <button
          onClick={onPurchase}
          disabled={isLoading}
          className={`w-full py-3 rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${primaryBg} hover:opacity-90`}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Purchase Now'}
        </button>

        <p className={`text-xs ${mutedClass} text-center mt-4`}>
          Included with Inner Circle subscription
        </p>
      </motion.div>
    </div>
  );
}
