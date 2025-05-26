import type {NextConfig} from "next";

// Check if we're building for Tauri (static export) or web deployment
const isTauriBuild = process.env.TAURI_BUILD === 'true';

const nextConfig: NextConfig = {
  // Only use static export for Tauri builds
  ...(isTauriBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  images: {
    unoptimized: true
  },
  // Enable experimental features for better performance
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
