'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, CheckCircle, Users, MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IssueCard } from '@/components/issue/IssueCard';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { IssueCardSkeleton, StatsSkeleton } from '@/components/ui/skeleton';
import { useNearbyIssues } from '@/hooks/useIssues';
import { useEffect, useState } from 'react';
import { api, Analytics } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  OnboardingModal,
  getStoredLocality,
  clearLocality,
  UserLocality,
} from '@/components/onboarding/OnboardingModal';

export function HomePage() {
  const { token } = useAuth();
  const [locality, setLocality] = useState<UserLocality | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // On mount, check if locality already stored
  useEffect(() => {
    const stored = getStoredLocality();
    if (stored) {
      setLocality(stored);
    } else {
      setShowOnboarding(true);
    }
  }, []);

  // Fetch nearby issues at 2km using locality coords
  const { issues, loading } = useNearbyIssues(
    locality?.lat ?? 0,
    locality?.lng ?? 0,
    2,
    !!locality
  );

  useEffect(() => {
    if (!token) return;
    api.getAnalytics(token)
      .then(({ analytics: data }) => setAnalytics(data))
      .catch(console.error);
  }, [token]);

  const handleOnboardingComplete = (loc: UserLocality) => {
    setLocality(loc);
    setShowOnboarding(false);
  };

  return (
    <>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Your Community, <span className="gradient-text">Powered by AI</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
            Report local issues, verify community problems, and track resolutions —
            all powered by AI and Google Maps.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/report">
              <Button size="lg">
                Report Issue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/map">
              <Button size="lg" variant="secondary">
                <MapPin className="w-4 h-4" />
                View Map
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Stats */}
        <section>
          {analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Issues" value={analytics.totalIssues} icon={AlertTriangle} index={0} />
              <StatCard label="Resolved" value={analytics.resolvedIssues} icon={CheckCircle} color="text-success" index={1} />
              <StatCard label="Resolution Rate" value={`${analytics.resolutionRate}%`} icon={CheckCircle} color="text-accent" index={2} />
              <StatCard label="Active Users" value={analytics.activeUsers} icon={Users} index={3} />
            </div>
          ) : (
            <StatsSkeleton />
          )}
        </section>

        {/* Nearby Issues + Leaderboard */}
        <div className="grid lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-semibold">Nearby Issues</h2>
                {locality && (
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {locality.address} · 2 km radius
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { clearLocality(); setShowOnboarding(true); setLocality(null); }}
                  className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 underline underline-offset-2"
                >
                  <LocateFixed className="w-3 h-3" /> Change locality
                </button>
                <Link href="/map" className="text-sm text-primary hover:underline">
                  View all on map
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <IssueCardSkeleton key={i} />)
                : issues.length > 0
                  ? issues.slice(0, 5).map((issue, i) => (
                      <IssueCard key={issue.id} issue={issue} index={i} />
                    ))
                  : (
                    <div className="glass-card p-8 text-center text-muted">
                      No issues found within 2 km of your locality. Be the first to report one!
                    </div>
                  )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Top Contributors</h2>
            <Leaderboard />
          </section>
        </div>
      </div>
    </>
  );
}
