/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Helpful for SEO + cleaner URLs
  trailingSlash: false,
  // Optimize for Vercel
  poweredByHeader: false,
  // Add caching headers + security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
