import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  stripe_customer_id: string | null;
  referral_code: string | null;
  referral_credits: number;
  referred_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string;
  subscription_interval: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache configuration
const AUTH_CACHE_KEY = 'crater_auth_cache';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CachedAuthData {
  userId: string;
  profile: Profile | null;
  isAdmin: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  timestamp: number;
}

// Cache helpers
const getCachedAuth = (userId: string): CachedAuthData | null => {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;

    const data: CachedAuthData = JSON.parse(cached);

    // Check if cache is for the same user and not expired
    if (data.userId !== userId) return null;
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    console.log('[AuthContext] Using cached auth data');
    return data;
  } catch {
    return null;
  }
};

const setCachedAuth = (data: CachedAuthData) => {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data));
    console.log('[AuthContext] Auth data cached');
  } catch {
    // Ignore localStorage errors
  }
};

const clearCachedAuth = () => {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
    console.log('[AuthContext] Auth cache cleared');
  } catch {
    // Ignore localStorage errors
  }
};

// Utility to wrap promises with timeout
const withTimeout = async <T,>(promise: Promise<T>, ms: number, label?: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error(`[AuthContext] ${label || 'Request'} timed out after ${ms}ms`);
      reject(new Error(`${label || 'Request'} timed out`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[AuthContext] No session for admin check');
        return false;
      }

      const { data, error } = await withTimeout(
        supabase.functions.invoke('check-admin', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        15000,
        'CheckAdminRole'
      );

      if (error) {
        console.error('[AuthContext] Error checking admin role:', error);
        return false;
      }

      console.log('[AuthContext] Admin check response:', data);
      return data?.isAdmin === true;
    } catch (err) {
      console.error('[AuthContext] Error checking admin role:', err);
      return false;
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('[AuthContext] Profile fetch failed:', err);
      return null;
    }
  };

  const refreshSubscription = async () => {
    if (!session?.access_token) return;

    try {
      console.log('[AuthContext] Refreshing subscription...');
      const { data, error } = await withTimeout(
        supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        15000,
        'CheckSubscription'
      );

      if (error) {
        console.error('[AuthContext] Error checking subscription:', error);
        return;
      }

      console.log('[AuthContext] Subscription data:', data);
      setSubscriptionStatus(data);

      // Update cache with new subscription data
      if (user?.id) {
        setCachedAuth({
          userId: user.id,
          profile,
          isAdmin,
          subscriptionStatus: data,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('[AuthContext] Error refreshing subscription:', err);
    }
  };

  // Helper to load all user data in PARALLEL
  const loadUserData = async (userId: string, useCacheOnly = false) => {
    console.log('[AuthContext] Loading user data...');
    const startTime = Date.now();

    // Try to use cached data first for instant UI
    const cached = getCachedAuth(userId);
    if (cached) {
      setProfile(cached.profile);
      setIsAdmin(cached.isAdmin);
      setSubscriptionStatus(cached.subscriptionStatus);
      console.log('[AuthContext] Restored from cache, admin:', cached.isAdmin);

      // If cache-only mode (for fast initial load), stop here
      if (useCacheOnly) {
        return;
      }
    }

    // Fetch fresh data (in background if we had cache)
    const [profileData, adminStatus] = await Promise.all([
      fetchProfile(userId).catch(err => {
        console.error('[AuthContext] Profile fetch failed:', err);
        return cached?.profile ?? null;
      }),
      checkAdminRole(userId).catch(err => {
        console.error('[AuthContext] Admin check failed:', err);
        return cached?.isAdmin ?? false;
      }),
    ]);

    console.log(`[AuthContext] User data loaded in ${Date.now() - startTime}ms`);

    // Set all state
    setProfile(profileData);
    setIsAdmin(adminStatus ?? false);
    console.log('[AuthContext] Admin status:', adminStatus);

    // Cache the fresh data
    setCachedAuth({
      userId,
      profile: profileData,
      isAdmin: adminStatus ?? false,
      subscriptionStatus: null, // Will be updated by refreshSubscription
      timestamp: Date.now(),
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] Auth state changed:', event);

      // For TOKEN_REFRESHED, just update session
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed, updating session only');
        setSession(newSession);
        return;
      }

      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          console.log('[AuthContext] User authenticated, loading data...');

          // Try to use cache first for instant UI
          const cached = getCachedAuth(newSession.user.id);
          if (cached) {
            setProfile(cached.profile);
            setIsAdmin(cached.isAdmin);
            setSubscriptionStatus(cached.subscriptionStatus);
            setIsLoading(false); // Show UI immediately
            console.log('[AuthContext] Restored from cache, loading fresh data in background...');

            // Load fresh data in background (don't await, don't block)
            loadUserData(newSession.user.id).catch(console.error);
          } else {
            // No cache, need to wait for data
            setIsLoading(true);
            await loadUserData(newSession.user.id);
            setIsLoading(false);
          }
        } else {
          console.log('[AuthContext] User signed out');
          setProfile(null);
          setSubscriptionStatus(null);
          setIsAdmin(false);
          setIsLoading(false);
          clearCachedAuth();
        }
      } catch (err) {
        console.error('[AuthContext] Auth state change error:', err);
        setProfile(null);
        setSubscriptionStatus(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    // Check initial session - use cache for fast load
    console.log('[AuthContext] Checking initial session...');
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('[AuthContext] Initial session:', initialSession ? 'exists' : 'none');

      try {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          // First, try to restore from cache for instant UI
          const cached = getCachedAuth(initialSession.user.id);
          if (cached) {
            setProfile(cached.profile);
            setIsAdmin(cached.isAdmin);
            setSubscriptionStatus(cached.subscriptionStatus);
            setIsLoading(false); // Show UI immediately with cached data
            console.log('[AuthContext] UI restored from cache, fetching fresh data in background...');

            // Then fetch fresh data in background (don't await)
            loadUserData(initialSession.user.id).catch(console.error);
          } else {
            // No cache, need to load everything
            setIsLoading(true);
            await loadUserData(initialSession.user.id);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Initial session check error:', err);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error('[AuthContext] Failed to get initial session:', err);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refresh subscription when session changes
  useEffect(() => {
    if (session?.access_token) {
      refreshSubscription();
    }
  }, [session?.access_token]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const logout = async () => {
    clearCachedAuth();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setSubscriptionStatus(null);
  };

  const register = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth?type=signup`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isAuthenticated: !!user,
      isLoading,
      isAdmin,
      subscriptionStatus,
      login,
      logout,
      register,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
