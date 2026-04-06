/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: 'http://localhost:3100/api/:path*',
      },
    ];
  },
};

export default nextConfig;
