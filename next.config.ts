import type {NextConfig} from "next";

// Check if we're building for Tauri (static export) or web deployment
const isTauriBuild = process.env.TAURI_BUILD === 'true';

const nextConfig: NextConfig = {
  // The basePath is set by the GitHub Pages action, we make it available here
  publicRuntimeConfig: {
    basePath: process.env.BASE_PATH || "", // BASE_PATH will be set by the GH Action
  },
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
