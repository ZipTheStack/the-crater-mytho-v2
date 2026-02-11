import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Price key type for checkout - matches price_key in database
export type PriceKey =
  | 'reader_monthly'
  | 'reader_yearly'
  | 'inner_circle_monthly'
  | 'inner_circle_yearly'
  | 'book_digital'
  | 'book_extras'
  | 'audiobook_only'
  | 'book_audiobook'
  | 'book_complete';

export interface StripePrice {
  id: string;
  price_key: string;
  stripe_price_id: string;
  stripe_product_id: string;
  display_name: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  price_type: 'subscription' | 'one_time';
  billing_interval: 'month' | 'year' | null;
  tier: 'reader' | 'inner_circle' | 'book' | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Format cents to dollars
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// Fetch all active prices from database
export function usePricing() {
  return useQuery({
    queryKey: ['pricing'],
    queryFn: async (): Promise<StripePrice[]> => {
      // Type assertion needed until types are regenerated from new schema
      const { data, error } = await (supabase as any)
        .from('stripe_prices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[usePricing] Error fetching prices:', error);
        throw error;
      }

      return data as StripePrice[];
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

// Get organized pricing data for UI
export function usePricingTiers() {
  const { data: prices, isLoading, error } = usePricing();

  const tiers = {
    reader: {
      name: 'Mythos Reader',
      monthly: prices?.find(p => p.price_key === 'reader_monthly'),
      yearly: prices?.find(p => p.price_key === 'reader_yearly'),
    },
    inner_circle: {
      name: 'Mythos Inner Circle',
      monthly: prices?.find(p => p.price_key === 'inner_circle_monthly'),
      yearly: prices?.find(p => p.price_key === 'inner_circle_yearly'),
    },
  };

  const bookPrices = {
    digital: prices?.find(p => p.price_key === 'book_digital'),
    extras: prices?.find(p => p.price_key === 'book_extras'),
    audiobook: prices?.find(p => p.price_key === 'audiobook_only'),
    bookAudiobook: prices?.find(p => p.price_key === 'book_audiobook'),
    complete: prices?.find(p => p.price_key === 'book_complete'),
  };

  return {
    tiers,
    bookPrices,
    allPrices: prices || [],
    isLoading,
    error,
  };
}

// Admin: Fetch all prices including archived
export function useAdminPricing(includeArchived = false) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['admin-pricing', includeArchived],
    queryFn: async (): Promise<StripePrice[]> => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'list', include_archived: includeArchived },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error('[useAdminPricing] Error:', error);
        throw error;
      }

      return data.prices as StripePrice[];
    },
    enabled: !!session?.access_token,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Admin: Create new price
export function useCreatePrice() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      price_key: string;
      display_name: string;
      description?: string;
      amount_cents: number;
      price_type: 'subscription' | 'one_time';
      billing_interval?: 'month' | 'year';
      tier?: 'reader' | 'inner_circle' | 'book';
      features?: string[];
    }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'create', ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.price as StripePrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      toast.success('Price created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create price: ${error.message}`);
    },
  });
}

// Admin: Update price info (name, features)
export function useUpdatePrice() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      display_name?: string;
      description?: string;
      features?: string[];
      sort_order?: number;
    }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'update', ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.price as StripePrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      toast.success('Price updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update price: ${error.message}`);
    },
  });
}

// Admin: Update price amount (creates new Stripe price)
export function useUpdatePriceAmount() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; amount_cents: number }) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'update_amount', ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.price as StripePrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      toast.success('Price amount updated and synced with Stripe');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update price: ${error.message}`);
    },
  });
}

// Admin: Archive price
export function useArchivePrice() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'archive', id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.price as StripePrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      toast.success('Price archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive price: ${error.message}`);
    },
  });
}

// Admin: Restore archived price
export function useRestorePrice() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-prices', {
        body: { action: 'restore', id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.price as StripePrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      toast.success('Price restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore price: ${error.message}`);
    },
  });
}
