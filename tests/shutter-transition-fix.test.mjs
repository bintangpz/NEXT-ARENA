import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Arena Shutter Transition & Single-Trigger Navigation Test Suite", () => {
  const rootDir = process.cwd();
  const shutterPath = path.join(rootDir, "src/components/ArenaShutterTransition.tsx");
  const homePath = path.join(rootDir, "src/app/page.tsx");
  const pengaturanPath = path.join(rootDir, "src/app/pengaturan/page.tsx");
  const tandingPath = path.join(rootDir, "src/app/tanding/[id]/page.tsx");

  const shutterContent = fs.readFileSync(shutterPath, "utf-8");
  const homeContent = fs.readFileSync(homePath, "utf-8");
  const pengaturanContent = fs.readFileSync(pengaturanPath, "utf-8");
  const tandingContent = fs.readFileSync(tandingPath, "utf-8");

  describe("Requirement 1: ArenaShutterTransition prevents re-triggering & double executions", () => {
    it("Stores onComplete callback in a ref to avoid dependency churn", () => {
      assert.strictEqual(
        shutterContent.includes("const onCompleteRef = useRef(onComplete);"),
        true,
        "Shutter transition must use useRef for onComplete callback"
      );
      assert.strictEqual(
        shutterContent.includes("onCompleteRef.current = onComplete;"),
        true,
        "Shutter transition must update onCompleteRef.current in useEffect"
      );
    });

    it("Animation effect does not include onComplete in its dependency array", () => {
      assert.strictEqual(
        shutterContent.includes("}, [isActive, mode]);"),
        true,
        "Animation effect must only re-trigger on isActive or mode change, not on onComplete reference change"
      );
    });

    it("Guards against re-triggering animation while it is already active (isRunningRef)", () => {
      assert.strictEqual(
        shutterContent.includes("isRunningRef.current"),
        true,
        "Must check isRunningRef to ignore mid-cycle parent re-renders"
      );
    });

    it("Guards against calling onComplete multiple times (hasCompletedRef)", () => {
      assert.strictEqual(
        shutterContent.includes("hasCompletedRef.current"),
        true,
        "Must check hasCompletedRef to ensure onComplete is only invoked once per cycle"
      );
    });
  });

  describe("Requirement 2: Dashboard & Pengaturan prevent double click and prefetch route", () => {
    it("Dashboard (page.tsx) guards handleStartMatchWithShutter against double activation", () => {
      assert.strictEqual(
        homeContent.includes("if (Boolean(shutterMatch)) return;"),
        true,
        "Dashboard must guard handleStartMatchWithShutter if shutterMatch is already active"
      );
    });

    it("Dashboard (page.tsx) prefetches tanding match route", () => {
      assert.strictEqual(
        homeContent.includes("router.prefetch(`/tanding/${match.id}`)"),
        true,
        "Dashboard must prefetch tanding route to eliminate first-time compilation delay"
      );
    });

    it("Dashboard Mulai Tanding button has disabled state during transition", () => {
      assert.strictEqual(
        homeContent.includes("disabled={Boolean(shutterMatch)}"),
        true,
        "Button must be disabled when shutter transition is active"
      );
    });

    it("Pengaturan guards handleStartMatchWithShutter against double activation", () => {
      assert.strictEqual(
        pengaturanContent.includes("if (Boolean(shutterMatch)) return;"),
        true,
        "Pengaturan must guard handleStartMatchWithShutter if shutterMatch is already active"
      );
    });

    it("Pengaturan prefetches tanding match route and disables button during transition", () => {
      assert.strictEqual(
        pengaturanContent.includes("router.prefetch(`/tanding/${match.id}`)"),
        true,
        "Pengaturan must prefetch tanding route"
      );
      assert.strictEqual(
        pengaturanContent.includes("disabled={Boolean(shutterMatch)}"),
        true,
        "Pengaturan button must be disabled when shutter transition is active"
      );
    });
  });

  describe("Requirement 3: Tanding page returns directly to Bagan on completion", () => {
    it("Winner modal navigates directly back to /?tab=bracket without cluttered next match jump button", () => {
      assert.strictEqual(
        tandingContent.includes('href="/?tab=bracket"'),
        true,
        "Tanding page winner modal must provide direct link back to /?tab=bracket"
      );
      assert.strictEqual(
        tandingContent.includes("Lanjut ke Laga Selanjutnya"),
        false,
        "Tanding page winner modal must not show the long Lanjut ke Laga Selanjutnya button"
      );
    });
  });
});

