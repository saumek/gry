import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const defaultAllowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "::1",
  "*.pinggy.link",
  "*.free.pinggy.link",
  "*.a.free.pinggy.link"
];

function normalizeDevOrigin(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).host.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

const extraAllowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map(normalizeDevOrigin)
  .filter((value): value is string => Boolean(value));

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
