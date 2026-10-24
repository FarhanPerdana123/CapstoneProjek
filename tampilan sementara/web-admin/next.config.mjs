import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config) {
    // Alias "@/" -> "src/" (didefinisikan eksplisit agar tidak bergantung
    // pada pembacaan tsconfig `paths` oleh Next).
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    return config;
  },

  // Backend Express berjalan terpisah di port 5000.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/uploads/:path*`
      }
    ];
  }
};

export default nextConfig;

