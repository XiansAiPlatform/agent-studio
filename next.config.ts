import type { NextConfig } from "next";

// Pragmatic Content-Security-Policy that does not require code changes elsewhere.
// Notes on why each relaxation exists (so it can be tightened later):
// - script-src 'unsafe-inline': the theme-bootstrap inline <script> in
//   src/app/layout.tsx and Next.js's own hydration inline scripts.
// - script-src 'unsafe-eval': required by Next dev HMR and the ace/jsoneditor editors.
// - style-src 'unsafe-inline': next-themes/Radix/Tailwind inject inline styles.
// - font-src 'self' data:: fonts are self-hosted via next/font (same-origin),
//   so no external font CDN allowance is needed.
// - img-src https: data: blob:: user/markdown content can reference external images.
// - connect-src 'self': SSE (/api/messaging/listen) and all data fetches are same-origin.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https:",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Enable standalone mode for Docker deployment
  output: 'standalone',
  
  // Optimize for production
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
  
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
