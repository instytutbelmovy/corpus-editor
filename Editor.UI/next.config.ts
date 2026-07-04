import type { NextConfig } from 'next';

let nextConfig: NextConfig;

if (process.env.NODE_ENV === 'development') {
  nextConfig = {
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
    output: 'export', // exports to ./out by default
    trailingSlash: true, // keep — SPA rewrites depend on /docs/[id]/index.html layout
  };
}

export default nextConfig;
