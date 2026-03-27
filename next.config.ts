import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Lockfiles above this folder (e.g. ~/package-lock.json) confuse Turbopack’s root detection. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  reactCompiler: true,
};

export default nextConfig;
