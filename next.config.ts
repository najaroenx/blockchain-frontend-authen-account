import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by the Dockerfile: it copies .next/standalone as the
  // production runtime image instead of shipping node_modules.
  output: "standalone",
  // Same env var libs/api.ts's apiUrl() and the Dockerfile use — keeping
  // this the single source of the value instead of hardcoding it here too,
  // so the two can't silently drift apart. Empty/unset -> served at root,
  // same as local dev today.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
