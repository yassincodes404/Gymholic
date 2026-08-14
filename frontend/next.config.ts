import type { NextConfig } from "next";

// Normal Next.js server build — the Blueprints store and booking system
// need real API routes (order/booking persistence, email sending), which
// `output: "export"` can't run. Deploys to Vercel with zero extra config.
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
