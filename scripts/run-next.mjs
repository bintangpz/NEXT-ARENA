// Launcher: menjalankan `next <perintah>` dengan flag --experimental-sqlite
// agar `node:sqlite` bawaan Node 22.5+ tersedia (Node < 22.13 masih butuh flag ini).
// Dengan begitu aplikasi tidak perlu modul native better-sqlite3 / Visual Studio C++.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const nextMajor = parseInt(require("next/package.json").version.split(".")[0], 10);

// Next < 16 memakai Webpack secara default dan tidak mengenal flag --webpack.
const args = process.argv.slice(2).filter((a) => !(a === "--webpack" && nextMajor < 16));

const flag = "--experimental-sqlite";
const existing = process.env.NODE_OPTIONS || "";
const nodeOptions = existing.includes(flag) ? existing : `${existing} ${flag}`.trim();

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[run-next] proses next berhenti karena sinyal ${signal}`);
    process.exit(1);
  }
  if (code !== 0 && code !== null) {
    console.error(`[run-next] proses next berhenti dengan exit code ${code}`);
  }
  process.exit(code ?? 0);
});
