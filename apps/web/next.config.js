/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ["@repo/ui", "@repo/utils"],
};

export default nextConfig;