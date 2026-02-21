import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["mysql2"],
  output: "standalone",
};

export default nextConfig;
