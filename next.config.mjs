/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push({
      '@electric-sql/pglite': 'commonjs @electric-sql/pglite',
    });
    return config;
  },
};

export default nextConfig;
