import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Suppress hydration warnings caused by browser extensions
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // This helps with hydration issues
  experimental: {
    // Ensures proper hydration
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
};

export default nextConfig;
