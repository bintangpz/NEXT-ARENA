import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Pengaturan Header Navigation Test", () => {
  const settingsPath = path.join(rootDir, "src/app/pengaturan/page.tsx");
  const settingsContent = fs.readFileSync(settingsPath, "utf-8");

  test("Requirement: 'Lihat Monitor' button is removed and 'Kembali ke Monitor Arena' is retained", () => {
    // Should NOT contain 'Lihat Monitor'
    assert.doesNotMatch(
      settingsContent,
      /Lihat Monitor/,
      "Pengaturan page should not contain 'Lihat Monitor' button"
    );

    // Should retain 'Kembali ke Monitor Arena'
    assert.match(
      settingsContent,
      /Kembali ke Monitor Arena/,
      "Pengaturan page should retain 'Kembali ke Monitor Arena' button"
    );
  });
});

