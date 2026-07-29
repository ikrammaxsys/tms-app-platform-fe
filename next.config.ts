import type { NextConfig } from "next"

const apiBase = (process.env.NEXT_PUBLIC_TMS_API_BASE_URL || "http://13.229.238.4:5128").replace(
  /\/$/,
  "",
)

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["10.20.180.91", "localhost", "169.254.83.107", "10.153.226.227"],
  // Browser calls /backend-api/* → proxied to the .NET API (no CORS needed).
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ]
  },
}

export default nextConfig
