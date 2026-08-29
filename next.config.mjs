/** @type {import('next').NextConfig} */

// Security headers (CSP with per-request nonce, HSTS, X-Frame-Options, etc.)
// are set in middleware.ts so each response can carry a fresh nonce.

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
