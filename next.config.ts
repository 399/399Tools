import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@libsql/client': '@libsql/client/web',
    };
    return config;
  },
};

export default nextConfig;
