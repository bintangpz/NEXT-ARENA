import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Bracket Finished Match Controls Visibility", () => {
  const homePath = path.join(process.cwd(), "src/app/page.tsx");
  const pengaturanPath = path.join(process.cwd(), "src/app/pengaturan/page.tsx");
  const apiRoutePath = path.join(process.cwd(), "src/app/api/bracket/route.ts");

  const homeContent = fs.readFileSync(homePath, "utf-8");
  const pengaturanContent = fs.readFileSync(pengaturanPath, "utf-8");
  const apiContent = fs.readFileSync(apiRoutePath, "utf-8");

  it("Hides Mulai Tanding button when match.status === 'Selesai' on both Dashboard and Pengaturan", () => {
    const startBtnGuardPattern =
      /\{match\.status !== "Selesai" && \(\s*<button(?:(?!<\/button>)[\s\S])*<span>Mulai Tanding<\/span>/;
    assert.ok(startBtnGuardPattern.test(homeContent), "Dashboard must hide Mulai Tanding when Selesai");
    assert.ok(startBtnGuardPattern.test(pengaturanContent), "Pengaturan must hide Mulai Tanding when Selesai");
  });

  it("Hides Siap Tanding and Berlangsung options in status pill when match.status === 'Selesai'", () => {
    const statusPillGuardPattern =
      /match\.status === "Selesai"\s*\?\s*\(\["Selesai"\] as const\)\s*:\s*\(\["Siap Tanding", "Berlangsung", "Selesai"\] as const\)/;
    assert.match(homeContent, statusPillGuardPattern);
    assert.match(pengaturanContent, statusPillGuardPattern);
  });

  it("Restores Siap Tanding status when Reset is confirmed via DELETE /api/bracket", () => {
    assert.ok(homeContent.includes("handleResetSingleMatch("));
    assert.ok(pengaturanContent.includes("handleResetSingleMatch("));
    assert.ok(apiContent.includes("status = 'Siap Tanding'"));
  });
});
