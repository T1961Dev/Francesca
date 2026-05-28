import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 32,
  },
  serverExternalPackages: [
    "@supabase/supabase-js",
    "apify-client",
    "mammoth",
    "openai",
    "pdf-parse",
    "pdfkit",
    "pptx2json",
    "resend",
    "stripe",
  ],
  experimental: {
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
