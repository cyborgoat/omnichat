/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Remove experimental.turbo as it's deprecated
  // Add proper static export configuration
  distDir: 'out',
  trailingSlash: true,
}

export default nextConfig
