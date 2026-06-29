'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { IssueMap } from '@/components/map/IssueMap';
import { IssueCard } from '@/components/issue/IssueCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyIssues } from '@/hooks/useIssues';
import { Select } from '@/components/ui/input';
import { CATEGORY_LABELS, ISSUE_CATEGORIES } from '@/constants';
import { IssueCardSkeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const { lat, lng, hasLocation, loading: geoLoading, error: geoError, refresh } =
    useGeolocation();
  const { issues, loading } = useNearbyIssues(lat, lng, 10, hasLocation);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const filtered = categoryFilter
    ? issues.filter((i) => i.category === categoryFilter)
    : issues;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Issue Map</h1>
            <p className="text-muted mt-1">Explore nearby community issues</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {geoLoading ? (
              <div className="glass-card h-[500px] flex items-center justify-center text-muted">
                <div className="text-center">
                  <p className="font-medium">Asking your browser for location</p>
                  <p className="text-sm mt-1">Waiting for permission so we can center the map on you.</p>
                </div>
              </div>
            ) : !hasLocation ? (
              <div className="glass-card h-[500px] flex items-center justify-center text-muted">
                <div className="text-center max-w-sm px-6">
                  <p className="font-medium">Live location is off</p>
                  <p className="text-sm mt-1 mb-4">
                    Click below to let the browser share your current position and load nearby issues.
                  </p>
                  <button
                    onClick={refresh}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
                  >
                    Use my live location
                  </button>
                </div>
              </div>
            ) : (
              <IssueMap
                issues={filtered}
                center={{ lat, lng }}
                height="500px"
                onIssueClick={(issue) => setSelectedIssue(issue.id)}
              />
            )}

            {geoError && !hasLocation && (
              <p className="text-xs text-muted mt-2">{geoError}</p>
            )}

            <div className="flex gap-4 mt-4 text-xs text-muted flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Resolved
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> Needs Verification
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <IssueCardSkeleton key={i} />)
              : filtered.length > 0
                ? filtered.map((issue, i) => (
                    <div
                      key={issue.id}
                      className={selectedIssue === issue.id ? 'ring-2 ring-primary rounded-xl' : ''}
                    >
                      <IssueCard issue={issue} index={i} compact />
                    </div>
                  ))
                : (
                  <div className="glass-card p-8 text-center text-muted text-sm">
                    {hasLocation ? 'No issues found nearby.' : 'Enable location to see nearby issues.'}
                  </div>
                )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
