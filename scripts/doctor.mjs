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

// 3. Cek Modul SQLite (better-sqlite3)
try {
  const { default: Database } = await import("better-sqlite3");
  const memDb = new Database(":memory:");
  const result = memDb.prepare("SELECT 1 AS status").get();
  if (result && result.status === 1) {
    console.log(`[3] better-sqlite3 : ✅ Berhasil dimuat & berfungsi normal`);
  } else {
    throw new Error("Query memori SQLite tidak menghasilkan output yang valid.");
  }
} catch (err) {
  hasErrors = true;
  console.log(`[3] better-sqlite3 : ❌ Gagal dimuat!`);
  console.log(`    Detail Error   : ${err.message}`);
  console.log(`    👉 Solusi      : Jalankan perintah: npm rebuild better-sqlite3`);
}

// 4. Cek Izin Tulis Direktori Data (data/next_arena.db)
try {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const { default: Database } = await import("better-sqlite3");
  const testDbPath = path.join(dataDir, "doctor_test.db");
  const testDb = new Database(testDbPath);
  testDb.exec("CREATE TABLE IF NOT EXISTS test (id INT); INSERT INTO test VALUES (1);");
  const count = testDb.prepare("SELECT COUNT(*) as c FROM test").get();
  testDb.close();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  console.log(`[4] Storage Disk   : ✅ Direktori 'data/' dapat dibaca & ditulisi (${count.c} row test)`);
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
