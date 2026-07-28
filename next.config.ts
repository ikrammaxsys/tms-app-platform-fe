import type { NextConfig } from "next"

const apiBase = (process.env.TMS_API_BASE_URL || "http://127.0.0.1:5128").replace(
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
