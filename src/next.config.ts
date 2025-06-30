import type { NextConfig } from 'next';

let nextConfig: NextConfig;

if (process.env.NODE_ENV === 'development') {
  nextConfig = {
    distDir: 'wwwroot',
    rewrites: async () => {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5087/api/:path*',
        },
      ];
    },
  };
} else {
  nextConfig = {
    output: 'export',
    distDir: '../wwwroot',
  };
}

export default nextConfig;
