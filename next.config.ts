import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3002/api/:path*", // your backend
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/01992d21-0e79-5382-c061-f8f0593ca576',
        permanent: false, // Use false for a 307 temporary redirect as specified
      },
    ]
  },
};

export default nextConfig;
