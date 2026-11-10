import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un servidor autocontenido y una imagen Docker de produccion pequena.
  output: "standalone",
  distDir: process.env.SEAL_EVENT_BUILD === "1" ? ".next-event" : ".next",
  poweredByHeader: false,
  agentRules: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", ...(process.env.SEAL_LAN_IP ? [process.env.SEAL_LAN_IP] : [])],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_PROXY_TARGET || "http://127.0.0.1:3001"}/:path*` }];
  },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      ...(development || process.env.SEAL_EVENT_BUILD === "1" ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
