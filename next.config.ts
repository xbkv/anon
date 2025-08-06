import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // experimental: {
  //   reactCompiler: true,
  // },
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
  // ESLintを無効化
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScriptの型チェックを無効化
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
