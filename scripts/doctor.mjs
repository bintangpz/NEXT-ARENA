import fs from "fs";
import path from "path";
import net from "net";

console.log("\n========================================================");
console.log("       🩺 NEXT ARENA - SYSTEM DIAGNOSTIC (DOCTOR)");
console.log("========================================================\n");

let hasErrors = false;

// 1. Cek Sistem Operasi & Arsitektur
console.log(`[1] Sistem Operasi : ${process.platform} (${process.arch})`);

// 2. Cek Versi Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0], 10);
if (majorVersion >= 22) {
  console.log(`[2] Versi Node.js  : ✅ ${nodeVersion} (Memenuhi syarat >= 22)`);
} else {
  hasErrors = true;
  console.log(`[2] Versi Node.js  : ❌ ${nodeVersion} (TERLALU LAMA!)`);
  console.log(`    👉 Solusi: Wajib update ke Node.js v22 LTS dari https://nodejs.org`);
  console.log(`       Atau jalankan: winget install OpenJS.NodeJS.LTS`);
}

// 3. Cek Modul SQLite Engine
let sqliteEngineName = "";
let createTestDb = null;

// Prioritas 1: node:sqlite (Bawaan resmi Node.js >= 22, 100% bebas crash C++ di Windows)
try {
  const { DatabaseSync } = await import("node:sqlite");
  if (DatabaseSync) {
    const memDb = new DatabaseSync(":memory:");
    const result = memDb.prepare("SELECT 1 AS status").get();
    if (result && result.status === 1) {
      sqliteEngineName = "node:sqlite (Bawaan Node 22, Bebas Crash C++)";
      createTestDb = (filePath) => new DatabaseSync(filePath);
      console.log(`[3] SQLite Engine  : ✅ ${sqliteEngineName}`);
    }
  }
} catch (e) {
  // node:sqlite tidak tersedia
}

// Prioritas 2: better-sqlite3, dites di proses terpisah supaya crash native tidak mematikan doctor
if (!sqliteEngineName) {
  console.log(`[3] SQLite Engine  : ⚠️ node:sqlite TIDAK tersedia di ${process.version} (butuh Node >= 22.13)`);
  const { spawnSync } = await import("node:child_process");
  const child = spawnSync(
    process.execPath,
    ["-e", "const D=require('better-sqlite3');const d=new D(':memory:');console.log(d.prepare('SELECT 1 AS s').get().s)"],
    { encoding: "utf8" }
  );
  if (child.status === 0 && child.stdout.trim() === "1") {
    console.log(`    better-sqlite3 : ✅ berfungsi (fallback)`);
    sqliteEngineName = "better-sqlite3";
    const { default: Database } = await import("better-sqlite3");
    createTestDb = (filePath) => new Database(filePath);
  } else {
    hasErrors = true;
    console.log(`    better-sqlite3 : ❌ CRASH (exit code ${child.status}) -> inilah penyebab server mati mendadak`);
    console.log(`    👉 Solusi      : Update Node.js ke versi LTS terbaru (>= 22.13, mis. v24 LTS) dari https://nodejs.org`);
    console.log(`       lalu: Remove-Item -Recurse -Force node_modules, .next ; npm install`);
  }
}

// 4. Cek Izin Tulis Direktori Data (data/next_arena.db)
try {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (createTestDb) {
    const testDbPath = path.join(dataDir, "doctor_test.db");
    const testDb = createTestDb(testDbPath);
    testDb.exec("CREATE TABLE IF NOT EXISTS test (id INT); INSERT INTO test VALUES (1);");
    const count = testDb.prepare("SELECT COUNT(*) as c FROM test").get();
    if (testDb.close) testDb.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch {}

    console.log(`[4] Storage Disk   : ✅ Direktori 'data/' dapat dibaca & ditulisi (${count.c} row test)`);
  } else {
    console.log(`[4] Storage Disk   : ⚠️ Dilewati karena engine SQLite belum siap`);
  }
} catch (err) {
  hasErrors = true;
  console.log(`[4] Storage Disk   : ❌ Gagal menulis database di folder 'data/'`);
  console.log(`    Detail Error   : ${err.message}`);
  console.log(`    👉 Solusi      : Hapus folder data dengan: Remove-Item -Recurse -Force data`);
}

// 5. Cek Port 3000
const checkPort = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });

const portAvailable = await checkPort(3000);
if (portAvailable) {
  console.log(`[5] Port 3000      : ✅ Port 3000 bebas & siap digunakan`);
} else {
  console.log(`[5] Port 3000      : ⚠️ Sedang dipakai aplikasi lain (atau proses node zombie)`);
  console.log(`    👉 Solusi      : Matikan node lama dengan: Stop-Process -Name node -Force`);
  console.log(`       Atau jalankan port lain: npm run dev -- -p 3005`);
}

console.log("\n--------------------------------------------------------");
if (hasErrors) {
  console.log("❌ KESIMPULAN: Ada kendala di sistem di atas.");
  console.log("Silakan ikuti petunjuk '👉 Solusi' yang tertera di baris bertanda ❌.");
} else {
  console.log("✅ KESIMPULAN: Sistem 100% SEHAT dan SIAP!");
  console.log("Silakan jalankan: npm run dev");
}
console.log("--------------------------------------------------------\n");

