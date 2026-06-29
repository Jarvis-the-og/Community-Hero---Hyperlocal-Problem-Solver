'use client';

import { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Issue } from '@/lib/api';
import { getMarkerColor } from '@/lib/utils';
import { CATEGORY_LABELS } from '@/constants';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface IssueMapProps {
  issues: Issue[];
  center: { lat: number; lng: number };
  zoom?: number;
  onIssueClick?: (issue: Issue) => void;
  height?: string;
  showUserLocation?: boolean;
}

export function IssueMap({
  issues,
  center,
  zoom = 14,
  onIssueClick,
  height = '400px',
  showUserLocation = true,
}: IssueMapProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const hasUsableApiKey = Boolean(apiKey && !apiKey.startsWith('your-'));

  const handleMarkerClick = useCallback(
    (issue: Issue) => {
      setSelectedIssue(issue);
      onIssueClick?.(issue);
    },
    [onIssueClick]
  );

  useEffect(() => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      setMapLoadError(true);
      previousAuthFailure?.();
    };

    return () => {
      window.gm_authFailure = previousAuthFailure;
    };
  }, []);

  if (!hasUsableApiKey || mapLoadError) {
    return (
      <div
        className="glass-card flex items-center justify-center text-muted text-sm"
        style={{ height }}
      >
        <div className="text-center p-6">
          <p className="font-medium mb-2">Map Preview</p>
          <p className="text-xs">
            {mapLoadError
              ? 'Google Maps could not load with the current browser key'
              : 'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            {issues.slice(0, 4).map((issue) => (
              <button
                key={issue.id}
                onClick={() => onIssueClick?.(issue)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: getMarkerColor(issue.priority, issue.status) }}
                />
                {issue.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ height }}>
      <APIProvider apiKey={apiKey!} onError={() => setMapLoadError(true)}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="community-hero-map"
          style={{ width: '100%', height: '100%' }}
        >
          {showUserLocation && (
            <AdvancedMarker position={center}>
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
            </AdvancedMarker>
          )}

          {issues.map((issue) => (
            <AdvancedMarker
              key={issue.id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              onClick={() => handleMarkerClick(issue)}
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: getMarkerColor(issue.priority, issue.status) }}
              />
            </AdvancedMarker>
          ))}

          {selectedIssue && (
            <InfoWindow
              position={{
                lat: selectedIssue.location.lat,
                lng: selectedIssue.location.lng,
              }}
              onCloseClick={() => setSelectedIssue(null)}
            >
              <div className="p-1 min-w-[200px]">
                <p className="font-semibold text-sm text-gray-900">{selectedIssue.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {CATEGORY_LABELS[selectedIssue.category]}
                </p>
                <Badge variant={selectedIssue.priority as 'critical' | 'medium' | 'low'}>
                  {selectedIssue.priority}
                </Badge>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
