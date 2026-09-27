import type { NextConfig } from "next";

const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  pageExtensions:
    process.env.NODE_ENV === "development" ? ["dev.tsx", ...PAGE_EXTENSIONS] : PAGE_EXTENSIONS,
};

export default nextConfig;
