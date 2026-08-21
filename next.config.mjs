/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["react-leaflet", "leaflet"],
};

export default nextConfig;
