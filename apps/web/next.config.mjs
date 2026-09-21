/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
