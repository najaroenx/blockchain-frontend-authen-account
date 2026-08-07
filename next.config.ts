import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by the Dockerfile: it copies .next/standalone as the
  // production runtime image instead of shipping node_modules.
  output: "standalone",
};

export default nextConfig;
