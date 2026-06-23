import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "ioredis", "nodemailer", "handlebars"],
};

export default nextConfig;
