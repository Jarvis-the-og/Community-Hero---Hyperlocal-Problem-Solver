'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2, Loader2, Shield, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'register';

function friendlyAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message) : 'Authentication failed';

  const map: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/wrong-password': 'The password is incorrect.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before completion.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  };

  return map[code] || message || 'Authentication failed';
}

function roleDestination(role?: string | null) {
  if (role === 'department') return '/department';
  if (role === 'worker') return '/worker';
  if (role === 'admin' || role === 'authority') return '/admin';
  return '/';
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '';
  const { user, loading, signIn, signInWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = useMemo(() => {
    if (!user) return '';
    return roleDestination(user.role);
  }, [user]);

  useEffect(() => {
    if (!loading && user && destination) {
      router.replace(destination);
    }
  }, [loading, user, destination, router]);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted">
            <Shield className="w-4 h-4 text-primary" />
            Secure access for citizens, departments, workers, and administrators
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Sign in to
              <span className="gradient-text"> Community Hero</span>
            </h1>
            <p className="mt-4 text-muted text-lg max-w-2xl">
              Use email/password or Google to enter your dashboard, manage complaints, and follow the city workflow end to end.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold">Email + Password</h2>
              </div>
              <p className="text-sm text-muted">Register or log in with your approved hackathon demo account or any Firebase Auth user.</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <h2 className="font-semibold">Google Sign-In</h2>
              </div>
              <p className="text-sm text-muted">Keep the existing Google flow for any account already connected to Firebase.</p>
            </Card>
          </div>

          <div className="text-sm text-muted">
            Current landing: {nextPath || 'role-based dashboard'}.
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-0 overflow-hidden">
            <div className="flex">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@communityhero.app"
                  autoComplete="email"
                  required
                />
              </div>

              {mode === 'register' && (
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button className="w-full" type="submit" disabled={submitting || googleLoading}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted">OR</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle} disabled={submitting || googleLoading}>
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Continue with Google
              </Button>

              <p className="text-xs text-muted leading-relaxed">
                {mode === 'register'
                  ? 'Registration creates a Firebase Auth account and then loads your Firestore profile.'
                  : 'Your role comes from your Firestore user document after authentication.'}
              </p>
            </form>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}
