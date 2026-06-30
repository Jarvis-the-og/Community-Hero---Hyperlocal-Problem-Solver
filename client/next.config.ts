import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting.
  // All pages are client components — no SSR features are used.
  output: 'export',

  images: {
    // next/image optimisation requires a running server.
    // With static export it must be disabled.
    // No <Image> components are used in this project;
    // this covers any that may be added in future.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // rewrites() is incompatible with static export and was only
  // used as a dev proxy. In production, lib/api.ts reads
  // NEXT_PUBLIC_API_URL directly and calls the Cloud Run backend,
  // so the rewrite was never active in a deployed environment.
};

export default nextConfig;
