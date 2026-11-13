/** @type {import('next').NextConfig} */
const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor < 22) {
  console.warn(
    `\n\x1b[33m⚠️  [Next Arena Warning] Node.js terdeteksi versi ${process.version}.\n` +
    `better-sqlite3 v13 direkomendasikan berjalan pada Node.js >= 22 (LTS).\n` +
    `Jika server dev crash atau keluar tiba-tiba tanpa error, silakan update Node.js ke versi 22 LTS.\x1b[0m\n`
  );
}

const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("better-sqlite3");
    }
    return config;
  },
};

export default nextConfig;
