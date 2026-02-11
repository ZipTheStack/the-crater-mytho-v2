import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Flame, Loader2, Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import authConfirmationBg from '@/assets/auth-confirmation-bg.jpg';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'confirmation';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const initialMode = type === 'recovery' ? 'reset' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const {
    login,
    register
  } = useAuth();
  const navigate = useNavigate();

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label?: string): Promise<T> => {
    let timeoutId: number | undefined;
    const startTime = Date.now();
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        console.error(`[Auth] ${label || 'Request'} timed out after ${ms}ms`);
        reject(new Error('Request timed out. Please check your connection and try again.'));
      }, ms);
    });
    try {
      const result = await Promise.race([promise, timeout]);
      console.log(`[Auth] ${label || 'Request'} completed in ${Date.now() - startTime}ms`);
      return result;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (type === 'signup') {
      toast.success('Email confirmed! You can sign in now.');
      setMode('login');
    }
  }, [type]);

  useEffect(() => {
    if (type !== 'recovery') return;

    const syncRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const code = url.searchParams.get('code');

        if (code) {
          await supabase.auth.exchangeCodeForSession(url.toString());
          return;
        }

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      } catch (err) {
        console.error('[Auth] Recovery session setup error:', err);
      }
    };

    syncRecoverySession();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured) {
      console.error('[Auth] Supabase not configured - missing environment variables');
      toast.error('Application not properly configured. Please contact support.');
      return;
    }

    setLoading(true);
    console.log(`[Auth] Starting ${mode} flow...`);

    try {
      if (mode === 'login') {
        console.log('[Auth] Attempting login...');
        const { error } = await withTimeout(login(email, password), 15000, 'Login');
        if (error) {
          console.error('[Auth] Login error:', error.message);
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
          console.log('[Auth] Login successful, checking admin role via edge function...');
          // Check if user is admin using edge function (bypasses RLS completely)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[Auth] Session found, calling check-admin function...');
            const { data, error: adminError } = await withTimeout(
              supabase.functions.invoke('check-admin', {
                headers: { Authorization: `Bearer ${session.access_token}` }
              }),
              10000,
              'AdminRoleCheck'
            );

            if (adminError) {
              console.error('[Auth] Error checking admin role:', adminError);
            }

            console.log('[Auth] Admin check response:', data);

            if (data?.isAdmin === true) {
              console.log('[Auth] Admin role confirmed, redirecting to /admin');
              navigate('/admin');
            } else {
              console.log('[Auth] No admin role, redirecting to /dashboard');
              navigate('/dashboard');
            }
          } else {
            console.log('[Auth] No session found after login, redirecting to /dashboard');
            navigate('/dashboard');
          }
        }
      } else if (mode === 'register') {
        console.log('[Auth] Attempting registration...');
        const { error } = await withTimeout(register(email, password, name), 15000, 'Register');
        if (error) {
          console.error('[Auth] Registration error:', error.message);
          toast.error(error.message);
        } else {
          console.log('[Auth] Registration successful');
          setConfirmationEmail(email);
          setMode('confirmation');
        }
      } else if (mode === 'forgot') {
        console.log('[Auth] Sending password reset email...');
        const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?type=recovery`
        }), 15000, 'PasswordReset');
        if (error) {
          console.error('[Auth] Password reset error:', error.message);
          toast.error(error.message);
        } else {
          console.log('[Auth] Password reset email sent');
          setConfirmationEmail(email);
          setMode('confirmation');
        }
      } else if (mode === 'reset') {
        console.log('[Auth] Updating password...');
        const { data: sessionData } = await withTimeout(supabase.auth.getSession(), 10000, 'GetSession');
        if (!sessionData?.session) {
          toast.error('Auth session missing. Please use the password reset link from your email again.');
          return;
        }
        const { error } = await withTimeout(supabase.auth.updateUser({
          password: newPassword
        }), 15000, 'UpdatePassword');
        if (error) {
          console.error('[Auth] Password update error:', error.message);
          toast.error(error.message);
        } else {
          console.log('[Auth] Password updated successfully');
          toast.success('Password updated successfully!');
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('[Auth] Unexpected error:', err);
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      console.log('[Auth] Form submission complete');
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Configuration warning banner */}
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground px-4 py-3 flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Application configuration error. Please contact support.</span>
        </div>
      )}

      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-flame-ember/5 blur-3xl rounded-full" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div className="relative w-full max-w-md" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8
      }}>
          {/* Logo */}
          <div className="text-center mb-12">
            <Link to="/">
              <Flame className="w-10 h-10 text-primary mx-auto mb-4 ember-flicker" />
              <h1 className="display-text text-2xl text-primary">The Crater Mythos</h1>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'confirmation' ? (
              <motion.div
                key="confirmation"
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Background image with dark overlay */}
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${authConfirmationBg})` }}
                />
                <div className="absolute inset-0 bg-black/70" />
                
                {/* Content */}
                <div className="relative z-10 max-w-md mx-auto px-6 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mail className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="display-text text-3xl text-primary mb-4">Check Your Email</h1>
                    <p className="text-lg text-foreground/90 mb-2">
                      We've sent a confirmation link to:
                    </p>
                    <p className="text-primary font-serif text-xl mb-6">
                      {confirmationEmail}
                    </p>
                    <p className="text-muted-foreground mb-8">
                      Click the link in the email to verify your account. If you don't see it in your inbox, check your spam folder.
                    </p>
                    <button
                      onClick={() => {
                        setMode('login');
                        setEmail('');
                        setPassword('');
                        setName('');
                      }}
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-serif"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to sign in
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            ) : mode === 'forgot' ? <motion.form key="forgot-form" onSubmit={handleSubmit} className="space-y-6" initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: 20
          }}>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-serif mb-2">Reset Password</h2>
                  <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-input border border-border rounded px-4 py-3 text-foreground font-serif focus:outline-none focus:border-primary transition-colors" 
                    placeholder="you@example.com" 
                    autoComplete="email"
                    required 
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground font-serif tracking-wide rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Back to sign in
                </button>
              </motion.form> : mode === 'reset' ? <motion.form key="reset-form" onSubmit={handleSubmit} className="space-y-6" initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: 20
          }}>
                <div className="text-center mb-6">
                  <h2 className="text-lg font-serif mb-2">Set New Password</h2>
                  <p className="text-sm text-muted-foreground">Enter your new password below</p>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="w-full bg-input border border-border rounded px-4 py-3 text-foreground font-serif focus:outline-none focus:border-primary transition-colors pr-12" 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                      required 
                      minLength={6} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground font-serif tracking-wide rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </motion.form> : <motion.form key="auth-form" onSubmit={handleSubmit} className="space-y-6" initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: 20
          }}>
                {/* Mode tabs */}
                <div className="flex border-b border-border">
                  <button type="button" onClick={() => setMode('login')} className={`flex-1 py-3 text-center font-serif transition-colors ${mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    Sign In
                  </button>
                  <button type="button" onClick={() => setMode('register')} className={`flex-1 py-3 text-center font-serif transition-colors ${mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    Create Account
                  </button>
                </div>

                {/* Name field (register only) */}
                <AnimatePresence>
                  {mode === 'register' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }}>
                      <label className="block text-sm text-muted-foreground mb-2">Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full bg-input border border-border rounded px-4 py-3 text-foreground font-serif focus:outline-none focus:border-primary transition-colors" 
                        placeholder="Your name" 
                        autoComplete="name"
                        required 
                      />
                    </motion.div>}
                </AnimatePresence>

                {/* Email */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-input border border-border rounded px-4 py-3 text-foreground font-serif focus:outline-none focus:border-primary transition-colors" 
                    placeholder="you@example.com" 
                    autoComplete="email"
                    required 
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm text-muted-foreground">Password</label>
                    {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Forgot password?
                      </button>}
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full bg-input border border-border rounded px-4 py-3 text-foreground font-serif focus:outline-none focus:border-primary transition-colors pr-12" 
                      placeholder="••••••••" 
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      required 
                      minLength={6} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember me (login only) */}
                {mode === 'login' && <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded border ${rememberMe ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center transition-colors`} onClick={() => setRememberMe(!rememberMe)}>
                      {rememberMe && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>}

                {/* Submit */}
                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground font-serif tracking-wide rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Please wait...' : mode === 'login' ? 'Enter' : 'Create Account'}
                </button>

                {mode === 'register' && <p className="text-xs text-center text-muted-foreground">
                    By creating an account, you agree to receive email updates about The Crater Mythos.
                  </p>}
              </motion.form>}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer with legal links */}
      <footer className="relative z-10 py-6 px-6">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link to="/legal/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
          <Link to="/contact/business" className="transition-colors text-base text-primary">
            Investor & Business Inquiries
          </Link>
        </div>
      </footer>
    </div>;
}
