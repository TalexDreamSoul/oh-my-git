import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'oh-my-git-next.orca.localhost', '*.orca.localhost'],
  turbopack: {},
  experimental: {
    optimizePackageImports: ['@codemirror/view', '@codemirror/state', '@xterm/xterm']
  }
};

export default nextConfig;
