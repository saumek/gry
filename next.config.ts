import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const defaultAllowedDevOrigins = ["localhost", "127.0.0.1", "::1"];

const extraAllowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: Array.from(
    new Set([...defaultAllowedDevOrigins, ...extraAllowedDevOrigins])
  ),
  turbopack: {
    root: projectRoot
  }
};

export default nextConfig;
