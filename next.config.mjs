/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: (() => {
    const origins = ['localhost', '127.0.0.1']
    const url = process.env.NEXT_PUBLIC_BASE_URL
    if (url) {
      try {
        origins.push(new URL(url).hostname)
      } catch {}
    }
    return Array.from(new Set(origins))
  })(),
}

export default nextConfig
