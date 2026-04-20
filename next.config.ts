import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@libsql/isomorphic-ws'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@libsql/client': '@libsql/client/web',
    };
    return config;
  },
};

export default nextConfig;
