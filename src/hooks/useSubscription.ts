import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PriceKey } from '@/hooks/usePricing';
import { toast } from 'sonner';

export function useSubscription() {
  const { session, subscriptionStatus, refreshSubscription } = useAuth();

  const createCheckout = async (priceType: PriceKey, bookId?: string) => {
    if (!session?.access_token) {
      toast.error('Please sign in to continue');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceType, bookId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to create checkout session');
        console.error('Checkout error:', error);
        return null;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        return data.url;
      }
      
      return null;
    } catch (err) {
      toast.error('Something went wrong');
      console.error('Checkout error:', err);
      return null;
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to continue');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error('Failed to open subscription management');
        console.error('Portal error:', error);
        return null;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        return data.url;
      }

      return null;
    } catch (err) {
      toast.error('Something went wrong');
      console.error('Portal error:', err);
      return null;
    }
  };

  const hasActiveSubscription = subscriptionStatus?.subscribed ?? false;
  const subscriptionTier = subscriptionStatus?.subscription_tier ?? 'none';
  const isInnerCircle = subscriptionTier === 'inner_circle';
  const isReader = subscriptionTier === 'reader' || isInnerCircle;

  return {
    createCheckout,
    openCustomerPortal,
    refreshSubscription,
    hasActiveSubscription,
    subscriptionTier,
    isInnerCircle,
    isReader,
    subscriptionEnd: subscriptionStatus?.subscription_end,
  };
}
