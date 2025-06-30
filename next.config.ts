import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   env: {
    MONGODB_URI: process.env.MONGODB_URI,
    DATABASE_URL: process.env.DATABASE_URL,
    MONGO_URL: process.env.MONGO_URL,
  },
};

export default nextConfig;
