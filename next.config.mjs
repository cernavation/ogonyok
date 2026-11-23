/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.giphy.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media*.giphy.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  devIndicators: false,
  async redirects() {
    return [
      { source: '/feed', destination: '/app', permanent: false },
      { source: '/community', destination: '/', permanent: true },
      { source: '/modes', destination: '/', permanent: true },
      { source: '/platform', destination: '/', permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },
      { source: '/examples', destination: '/', permanent: true },
      { source: '/manifesto', destination: '/', permanent: true },
      { source: '/reviews', destination: '/', permanent: true },
      { source: '/support', destination: '/', permanent: true },
      { source: '/telegram', destination: '/', permanent: true },
      { source: '/privacy', destination: '/legal', permanent: true },
      { source: '/terms', destination: '/legal', permanent: true },
      { source: '/ru/ai', destination: '/ai/ru', permanent: false },
      { source: '/ro/ai', destination: '/ai/ro', permanent: false },
      { source: '/en/ai', destination: '/ai/en', permanent: false },
      { source: '/ru/legal', destination: '/legal/ru', permanent: false },
      { source: '/ro/legal', destination: '/legal/ro', permanent: false },
      { source: '/en/legal', destination: '/legal/en', permanent: false },
    ]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.giphy.com https://images.unsplash.com https://lh3.googleusercontent.com",
      "media-src 'self' data: blob: https://*.supabase.co https://*.giphy.com",
      "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://api.giphy.com https://va.vercel-scripts.com https://*.metered.live https://*.metered.ca",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
