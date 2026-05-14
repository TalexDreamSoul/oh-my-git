import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ['@codemirror/view', '@codemirror/state', '@xterm/xterm']
  }
};

export default nextConfig;
