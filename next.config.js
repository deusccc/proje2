/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14'te appDir artık varsayılan olarak etkin
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  webpack: (config, { isServer }) => {
    // Client-side webpack konfigürasyonu
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  // Hydration sorunlarını önlemek için
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig 