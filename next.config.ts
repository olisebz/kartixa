import type { NextConfig } from "next";

const turbopackRoot = process.env.INIT_CWD ?? process.cwd();

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["mysql2"],
  output: "standalone",
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
