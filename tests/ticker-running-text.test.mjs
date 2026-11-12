import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Ticker Running Text & Remove Ubah Ticker Test Suite", () => {
  const pagePath = path.join(rootDir, "src/app/page.tsx");
  const cssPath = path.join(rootDir, "src/app/globals.css");
  const settingsPath = path.join(rootDir, "src/app/pengaturan/page.tsx");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const settingsContent = fs.readFileSync(settingsPath, "utf-8");

  test("Requirement 1: Dashboard removes 'Ubah Ticker' button and inline edit form", () => {
    // Should NOT contain the 'Ubah Ticker' button
    assert.doesNotMatch(
      pageContent,
      /Ubah Ticker/,
      "Dashboard should not have 'Ubah Ticker' button"
    );

    // Should NOT contain isEditingAnnouncement state
    assert.doesNotMatch(
      pageContent,
      /isEditingAnnouncement/,
      "isEditingAnnouncement state should no longer exist in page.tsx"
    );

    // Should NOT contain the old inline form for editing announcement
    assert.doesNotMatch(
      pageContent,
      /<form[^>]*onSubmit=\{handleSaveAnnouncement\}/,
      "Inline form for editing announcement should no longer exist in page.tsx"
    );
  });

  test("Requirement 2: Dashboard ticker is now continuous running text (animate-marquee)", () => {
    // Should contain animate-marquee in page.tsx
    assert.match(
      pageContent,
      /animate-marquee/,
      "Dashboard ticker should use animate-marquee class for running text"
    );

    // Should render announcement inside the marquee
    assert.match(
      pageContent,
      /\{announcement\s*\|\|/,
      "Ticker should render announcement text"
    );

    // Should have overflow-hidden container
    assert.match(
      pageContent,
      /overflow-hidden/,
      "Ticker container should clip overflow"
    );
  });

  test("Requirement 3: globals.css defines keyframes marquee and .animate-marquee", () => {
    // Keyframes marquee
    assert.match(
      cssContent,
      /@keyframes\s+marquee\s*\{[\s\S]*?transform:\s*translateX\(-100%\)/,
      "globals.css must define @keyframes marquee translating to -100%"
    );

    // .animate-marquee class
    assert.match(
      cssContent,
      /\.animate-marquee\s*\{[\s\S]*?animation:\s*marquee/,
      "globals.css must define .animate-marquee class with marquee animation"
    );

    // Hover pause behavior
    assert.match(
      cssContent,
      /animation-play-state:\s*paused/,
      "globals.css should allow pausing on hover"
    );
  });

  test("Requirement 4: Announcement configuration is retained in Pengaturan", () => {
    // Teks Pengumuman Berjalan (Ticker) in /pengaturan
    assert.match(
      settingsContent,
      /Teks Pengumuman Berjalan \(Ticker\)/,
      "Settings page must still have Ticker section"
    );
    assert.match(
      settingsContent,
      /value=\{announcement\}/,
      "Settings page must bind announcement value"
    );
  });
});

