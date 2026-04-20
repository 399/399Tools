import type { NextConfig } from "next";
import path from "path";

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
      '@libsql/isomorphic-ws': path.resolve(__dirname, 'libsql-ws-mock.mjs'),
    };
    return config;
  },
};

export default nextConfig;
