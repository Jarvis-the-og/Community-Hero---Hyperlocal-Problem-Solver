'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, MapPin, Loader2, AlertTriangle, CheckCircle, Sparkles, LogIn, PartyPopper,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IssueMap } from '@/components/map/IssueMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/context/AuthContext';
import { api, VisionAnalysis, DuplicateMatch, Issue } from '@/lib/api';
import { uploadIssueMedia } from '@/lib/storage';
import { isFirebaseConfigured } from '@/lib/firebase';
import { CATEGORY_LABELS, ISSUE_CATEGORIES } from '@/constants';

async function reverseGeocodeClient(lat: number, lng: number): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      return data.results[0].formatted_address;
    }
  } catch {
    // fall through
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function forwardGeocodeClient(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, formatted: data.results[0].formatted_address };
    }
  } catch {
    // fall through
  }
  return null;
}

export function ReportIssueForm() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { lat, lng, hasLocation, loading: geoLoading, error: geoError, refresh } =
    useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locationMode, setLocationMode] = useState<'live' | 'manual'>('live');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualGeocodedAddress, setManualGeocodedAddress] = useState('');
  const [manualGeocoding, setManualGeocoding] = useState(false);
  const [liveAddressEditing, setLiveAddressEditing] = useState(false);
  const [liveAddressOverride, setLiveAddressOverride] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submittedIssue, setSubmittedIssue] = useState<Issue | null>(null);

  // Effective coordinates and address
  const effectiveLat = locationMode === 'live' ? lat : (manualCoords?.lat ?? lat);
  const effectiveLng = locationMode === 'live' ? lng : (manualCoords?.lng ?? lng);
  const effectiveAddress = locationMode === 'live'
    ? (liveAddressOverride || address)
    : (manualGeocodedAddress || manualAddress);
  const effectiveHasLocation = locationMode === 'live' ? hasLocation : (manualCoords !== null);

  // Reverse geocode as soon as we have live coordinates
  useEffect(() => {
    if (locationMode !== 'live' || !hasLocation || geoLoading) return;
    setGeocoding(true);
    reverseGeocodeClient(lat, lng).then((addr) => {
      setAddress(addr);
      setGeocoding(false);
    });
  }, [locationMode, hasLocation, lat, lng, geoLoading]);

  // Forward geocode manual address with 600ms debounce after user stops typing
  useEffect(() => {
    if (locationMode !== 'manual' || manualAddress.trim().length < 5) {
      setManualCoords(null);
      return;
    }
    setManualGeocoding(true);
    const timer = setTimeout(async () => {
      const result = await forwardGeocodeClient(manualAddress);
      if (result) {
        setManualCoords({ lat: result.lat, lng: result.lng });
        // Store the full formatted address for submission but don't replace user input
        setManualGeocodedAddress(result.formatted);
      } else {
        setManualCoords(null);
        setManualGeocodedAddress('');
      }
      setManualGeocoding(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [locationMode, manualAddress]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    severity: 'medium',
    department: '',
  });

  const handleFileSelect = async (selectedFile: File) => {
    if (!token) {
      setError('Please sign in to report an issue');
      return;
    }

    if (locationMode === 'live' && (!hasLocation || geoLoading)) {
      setError('Waiting for your live location. Please allow location access first.');
      return;
    }
    if (locationMode === 'manual' && !manualAddress.trim()) {
      setError('Please enter a location address.');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setAnalyzing(true);
    setError(null);

    try {
      const { analysis: result, location } = await api.analyzeMedia(selectedFile, effectiveLat, effectiveLng, token);
      setAnalysis(result);
      setForm({
        title: result.title,
        description: result.description,
        category: result.category,
        severity: result.severity,
        department: result.department,
      });
      if (location?.address && locationMode === 'live') setAddress(location.address);

      const dupes = await api.checkDuplicates({
        lat: effectiveLat,
        lng: effectiveLng,
        category: result.category,
        title: result.title,
        description: result.description,
      }, token);
      if (dupes.isDuplicate) setDuplicates(dupes.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (supportExisting?: string) => {
    if (!token) {
      setError('Please sign in to continue');
      return;
    }

    if (locationMode === 'live' && (!hasLocation || geoLoading)) {
      setError('Waiting for your live location. Please allow location access first.');
      return;
    }
    if (locationMode === 'manual' && !manualAddress.trim()) {
      setError('Please enter a location address.');
      return;
    }

    if (supportExisting) {
      await api.supportIssue(supportExisting, token);
      router.push(`/issues/${supportExisting}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('severity', form.severity);
      formData.append('department', form.department);
      formData.append('aiConfidence', String(analysis?.confidence || 0.7));
      formData.append('lat', String(effectiveLat));
      formData.append('lng', String(effectiveLng));
      if (analysis?.hazards) formData.append('hazards', JSON.stringify(analysis.hazards));

      if (file && isFirebaseConfigured() && user) {
        const mediaUrl = await uploadIssueMedia(file, user.id);
        formData.append('mediaUrls', JSON.stringify([mediaUrl]));
      } else if (file) {
        formData.append('media', file);
      }

      const { issue } = await api.createIssue(formData, token);
      setSubmittedIssue(issue);
    } catch (err) {
      if (err instanceof Error && err.message.includes('duplicate')) {
        setError('Duplicate detected. Consider supporting the existing report.');
      } else {
        setError(err instanceof Error ? err.message : 'Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedIssue) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Report Submitted!</h1>
          <p className="text-muted mb-8">
            Your issue has been analyzed, categorized, and saved. Community members nearby can now verify it.
          </p>
          <div className="glass-card p-6 mb-8 text-left">
            <Badge variant={submittedIssue.priority as 'critical' | 'medium' | 'low'}>
              {submittedIssue.priority}
            </Badge>
            <h2 className="text-xl font-semibold mt-3">{submittedIssue.title}</h2>
            <p className="text-sm text-muted mt-2">{submittedIssue.location?.address}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href={`/issues/${submittedIssue.id}`}>
              <Button>View Issue</Button>
            </Link>
            <Button variant="secondary" onClick={() => { setSubmittedIssue(null); setFile(null); setPreview(null); setAnalysis(null); }}>
              Report Another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
        <p className="text-muted mb-6">Sign in to report community issues and earn points.</p>
        <Link href="/auth">
          <Button>Go to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Report an Issue</h1>
        <p className="text-muted mb-8">
          Upload a photo and our AI will analyze it automatically
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card
            className="p-6 border-dashed border-2 border-white/15 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <AnimatePresence>
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <div className="space-y-2 text-left w-max mx-auto">
                          {[
                            "Detecting objects...",
                            "Identifying issue...",
                            "Estimating severity...",
                            "Finding hazards...",
                            "Suggesting department...",
                            "Calculating confidence..."
                          ].map((step, i) => (
                            <motion.div
                              key={step}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.4 }}
                              className="flex items-center gap-2 text-sm text-white/90"
                            >
                              <CheckCircle className="w-4 h-4 text-primary" />
                              <span>{step}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="font-medium">Upload Photo or Video</p>
                <p className="text-sm text-muted mt-1">Tap to capture or select media</p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Location</span>
              </div>
              {/* Toggle between live GPS and manual */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLocationMode('live')}
                  className={`px-3 py-1 rounded-md transition-colors ${locationMode === 'live' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
                >
                  Live GPS
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('manual')}
                  className={`px-3 py-1 rounded-md transition-colors ${locationMode === 'manual' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
                >
                  Manual
                </button>
              </div>
            </div>

            {locationMode === 'live' ? (
              geoLoading ? (
                <p className="text-sm text-muted animate-pulse">Asking your browser for location...</p>
              ) : (
                <div className="space-y-3">
                  {hasLocation ? (
                    geocoding ? (
                      <p className="text-sm text-muted animate-pulse">Resolving address...</p>
                    ) : liveAddressEditing ? (
                      <div>
                        <div className="relative">
                          <Input
                            autoFocus
                            value={liveAddressOverride || address}
                            onChange={(e) => setLiveAddressOverride(e.target.value)}
                            placeholder="Edit address..."
                          />
                        </div>
                        <p className="text-xs text-muted mt-1">
                          GPS pin stays at your detected position. Only the address label is changed.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => setLiveAddressEditing(false)}
                        >
                          <CheckCircle className="w-3 h-3" /> Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-muted flex-1">
                          {liveAddressOverride || address}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setLiveAddressOverride(liveAddressOverride || address);
                            setLiveAddressEditing(true);
                          }}
                          className="text-xs text-primary/70 hover:text-primary shrink-0 underline underline-offset-2"
                        >
                          Edit
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted">Live location is not enabled yet.</p>
                  )}
                  <Button variant="secondary" size="sm" onClick={refresh}>
                    Use my live location
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted mb-1">Address / Landmark</Label>
                  <div className="relative">
                    <Input
                      value={manualAddress}
                      onChange={(e) => {
                        setManualAddress(e.target.value);
                        setManualCoords(null);
                        setManualGeocodedAddress('');
                      }}
                      placeholder="e.g. Park Street, Kolkata"
                    />
                    {manualGeocoding && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted" />
                    )}
                  </div>
                  {/* Show the geocoded full address as a non-intrusive extension */}
                  {manualGeocodedAddress && !manualGeocoding && (
                    <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {manualGeocodedAddress}
                    </p>
                  )}
                  {!manualCoords && !manualGeocoding && manualAddress.trim().length >= 5 && !manualGeocodedAddress && (
                    <p className="text-xs text-warning mt-1">Location not found — try a more specific address</p>
                  )}
                </div>
              </div>
            )}

            {geoError && !hasLocation && locationMode === 'live' && (
              <p className="text-xs text-warning mt-2">{geoError}</p>
            )}
          </Card>

          {(locationMode === 'live' ? hasLocation : (manualCoords !== null)) ? (
            <IssueMap issues={[]} center={{ lat: effectiveLat, lng: effectiveLng }} zoom={15} height="200px" />
          ) : (
            <Card className="h-[200px] flex items-center justify-center text-muted">
              <div className="text-center px-6">
                {locationMode === 'live' ? (
                  <>
                    <p className="font-medium">Waiting for live location</p>
                    <p className="text-sm mt-1">Click the button above to let the browser share your current position.</p>
                  </>
                ) : (
                  <>
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Map preview</p>
                    <p className="text-sm mt-1">Type an address above to see the pin.</p>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {analysis && (
            <Card className="p-5 border-primary/30 bg-primary/5 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-lg">AI Analysis Complete</span>
                </div>
                <Badge variant="info" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                  {Math.round(analysis.confidence * 100)}% Confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider">Inferred Category</p>
                  <p className="font-medium text-sm capitalize">{analysis.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider">Suggested Dept.</p>
                  <p className="font-medium text-sm">{analysis.department}</p>
                </div>
              </div>

              {analysis.hazards?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2 uppercase tracking-wider">Identified Hazards</p>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.hazards.map((h) => (
                      <Badge key={h} variant="critical" className="bg-destructive/10 text-destructive border-destructive/20">{h}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {duplicates.length > 0 && (
            <Card className="p-4 border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Possible Duplicate Found</span>
              </div>
              {duplicates.map((dup) => (
                <div key={dup.issueId} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{dup.title}</p>
                    <p className="text-xs text-muted">{Math.round(dup.similarity * 100)}% similar · {dup.distance}m away</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleSubmit(dup.issueId)}>
                    Support
                  </Button>
                </div>
              ))}
            </Card>
          )}

          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Issue title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="critical">Critical</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" size="lg" onClick={() => handleSubmit()} disabled={submitting || !form.title || analyzing || (locationMode === 'manual' && !manualAddress.trim())}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {locationMode === 'manual' && !manualCoords && manualAddress.trim().length >= 5
              ? 'Resolving location...'
              : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  );
}
