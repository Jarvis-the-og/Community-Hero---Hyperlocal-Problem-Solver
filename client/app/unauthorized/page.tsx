'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, LogIn } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function prettyRole(role: string | null) {
  if (!role) return 'Not signed in';
  return role
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(', ');
}

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const current = prettyRole(searchParams.get('current'));
  const required = prettyRole(searchParams.get('required'));

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <Card className="text-center p-10">
        <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Access Restricted</h1>
        <p className="text-muted mb-6">
          You are signed in, but your account does not have permission to view this page.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Current Role</p>
            <p className="font-semibold">{current}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Required Role</p>
            <p className="font-semibold">{required}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/auth">
            <Button>
              <LogIn className="w-4 h-4" />
              Go to Sign In
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted">Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
