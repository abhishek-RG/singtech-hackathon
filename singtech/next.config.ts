import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Old URLs from earlier builds keep working.
  async redirects() {
    return [
      { source: "/explorer", destination: "/", permanent: false },
      { source: "/call-assist", destination: "/copilot", permanent: false },
      { source: "/portal", destination: "/proposals", permanent: false },
      { source: "/impact", destination: "/insights", permanent: false },
      { source: "/outbox", destination: "/activity", permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
