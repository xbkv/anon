import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['cdn.yay.space'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.yay.space',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // 本番環境でのパフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

export default nextConfig;
