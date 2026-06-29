'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const LOCALITY_KEY = 'ch_user_locality';

export interface UserLocality {
  lat: number;
  lng: number;
  address: string;
}

export function getStoredLocality(): UserLocality | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCALITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLocality() {
  if (typeof window !== 'undefined') localStorage.removeItem(LOCALITY_KEY);
}

async function forwardGeocode(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
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
  } catch { /* ignore */ }
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
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
  } catch { /* ignore */ }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

interface OnboardingModalProps {
  onComplete: (locality: UserLocality) => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<'choose' | 'manual' | 'locating'>('choose');
  const [manualInput, setManualInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeooded] = useState<{ lat: number; lng: number; formatted: string } | null>(null);
  const [error, setError] = useState('');

  // Debounced forward geocode as user types
  useEffect(() => {
    if (manualInput.trim().length < 4) { setGeooded(null); return; }
    const timer = setTimeout(async () => {
      setGeocoding(true);
      const result = await forwardGeocode(manualInput);
      setGeooded(result);
      setGeocoding(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [manualInput]);

  const handleLiveLocation = () => {
    setStep('locating');
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        const locality: UserLocality = { lat, lng, address };
        localStorage.setItem(LOCALITY_KEY, JSON.stringify(locality));
        onComplete(locality);
      },
      () => {
        setError('Could not get your location. Please enter it manually.');
        setStep('manual');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualConfirm = () => {
    if (!geocoded) return;
    const locality: UserLocality = { lat: geocoded.lat, lng: geocoded.lng, address: geocoded.formatted };
    localStorage.setItem(LOCALITY_KEY, JSON.stringify(locality));
    onComplete(locality);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Community Hero</h2>
          <p className="text-muted mt-2 text-sm">
            To show you issues near you, we need to know your locality.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <Button className="w-full justify-start gap-3 h-14" onClick={handleLiveLocation}>
                <Navigation className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Use my live location</p>
                  <p className="text-xs opacity-70">Let the browser detect where you are</p>
                </div>
              </Button>

              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-14"
                onClick={() => setStep('manual')}
              >
                <MapPin className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Enter my locality</p>
                  <p className="text-xs opacity-70">Type a neighbourhood, street or landmark</p>
                </div>
              </Button>
            </motion.div>
          )}

          {step === 'locating' && (
            <motion.div
              key="locating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted">Getting your location…</p>
            </motion.div>
          )}

          {step === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Input
                  autoFocus
                  value={manualInput}
                  onChange={(e) => { setManualInput(e.target.value); setGeooded(null); }}
                  placeholder="e.g. Park Street, Kolkata"
                  className="pr-10"
                />
                {geocoding && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted" />
                )}
              </div>

              {geocoded && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2"
                >
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary/90">{geocoded.formatted}</p>
                </motion.div>
              )}

              {!geocoded && !geocoding && manualInput.trim().length >= 4 && (
                <p className="text-xs text-warning">Location not found — try a more specific name</p>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep('choose')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!geocoded || geocoding}
                  onClick={handleManualConfirm}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
