'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { IssueMap } from '@/components/map/IssueMap';
import { IssueCard } from '@/components/issue/IssueCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyIssues } from '@/hooks/useIssues';
import { Select } from '@/components/ui/input';
import { CATEGORY_LABELS, ISSUE_CATEGORIES } from '@/constants';
import { IssueCardSkeleton } from '@/components/ui/skeleton';
import { useDeployment } from '@/hooks/useDeployment';

export default function MapPage() {
  const deploy = useDeployment();
  const { lat, lng, hasLocation, loading: geoLoading, error: geoError, refresh } =
    useGeolocation();
  // If no location, fetch a larger area around the city center (or all issues)
  const queryLat = hasLocation ? lat : deploy.mapCenter.lat;
  const queryLng = hasLocation ? lng : deploy.mapCenter.lng;
  const queryRadius = hasLocation ? 5 : 20; // 20km for whole city

  const { issues, loading } = useNearbyIssues(queryLat, queryLng, queryRadius, true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [boroughFilter, setBoroughFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const wardOptions = useMemo(() => {
    return Array.from(
      new Set(issues.map((issue) => issue.location?.ward).filter((ward): ward is string => Boolean(ward)))
    ).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const boroughOptions = useMemo(() => {
    return Array.from(
      new Set(issues.map((issue) => issue.location?.borough).filter((borough): borough is string => Boolean(borough)))
    ).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(issues.map((issue) => issue.department).filter((department): department is string => Boolean(department)))
    ).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const filtered = issues.filter((issue) => {
    if (categoryFilter && issue.category !== categoryFilter) return false;
    if (boroughFilter && issue.location?.borough !== boroughFilter) return false;
    if (wardFilter && issue.location?.ward !== wardFilter) return false;
    if (departmentFilter && issue.department !== departmentFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Issue Map</h1>
            <p className="text-muted mt-1">Explore nearby community issues</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted" />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-36">
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
            <Select value={boroughFilter} onChange={(e) => setBoroughFilter(e.target.value)} className="w-36">
              <option value="">All Boroughs</option>
              {boroughOptions.map((borough) => <option key={borough} value={borough}>{borough}</option>)}
            </Select>
            <Select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="w-36">
              <option value="">All Wards</option>
              {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
            </Select>
            <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-36">
              <option value="">All Departments</option>
              {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
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
              <div className="relative">
                <IssueMap
                  issues={filtered}
                  center={deploy.mapCenter}
                  zoom={deploy.defaultZoom}
                  height="500px"
                  onIssueClick={(issue) => setSelectedIssue(issue.id)}
                  showUserLocation={false}
                />
                <div className="absolute top-4 left-4 right-4 z-10 glass-card p-4 rounded-xl flex items-center justify-between border border-white/20 shadow-lg">
                  <div>
                    <p className="font-semibold text-sm">Showing issues across {deploy.city}</p>
                    <p className="text-xs text-muted mt-1">Live location is off.</p>
                  </div>
                  <button
                    onClick={refresh}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    Use live location
                  </button>
                </div>
              </div>
            ) : (
              <IssueMap
                issues={filtered}
                center={{ lat, lng }}
                zoom={14}
                height="500px"
                onIssueClick={(issue) => setSelectedIssue(issue.id)}
                showUserLocation={true}
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
