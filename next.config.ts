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
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019a3e8c-b6bb-25c2-f08b-5d5ade7c2f4b',
        permanent: false, // Use false for a 307 temporary redirect as specified
      },
    ]
  },
};

export default nextConfig;
