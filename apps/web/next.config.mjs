/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
