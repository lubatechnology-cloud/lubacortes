import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
