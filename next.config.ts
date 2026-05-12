import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /** Intake allows multiple 5 MB documents */
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
