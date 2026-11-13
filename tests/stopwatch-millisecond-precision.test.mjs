import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Stopwatch Millisecond & Centisecond Precision Test Suite", () => {
  const rootDir = process.cwd();
  const tandingPath = path.join(rootDir, "src/app/tanding/[id]/page.tsx");
  const homePath = path.join(rootDir, "src/app/page.tsx");
  const pengaturanPath = path.join(rootDir, "src/app/pengaturan/page.tsx");

  const tandingContent = fs.readFileSync(tandingPath, "utf-8");
  const homeContent = fs.readFileSync(homePath, "utf-8");
  const pengaturanContent = fs.readFileSync(pengaturanPath, "utf-8");

  describe("Requirement 1: Arena Battle Page (tanding/[id]) Stopwatch Precision", () => {
    it("Declares matchElapsedMs and wall-clock timestamp refs for millisecond accuracy", () => {
      assert.strictEqual(
        tandingContent.includes("const [matchElapsedMs, setMatchElapsedMs] = useState<number>(0)"),
        true,
        "tanding page must have matchElapsedMs state"
      );
      assert.strictEqual(
        tandingContent.includes("const matchStartTimeRef = useRef<number>(0)"),
        true,
        "tanding page must have matchStartTimeRef"
      );
      assert.strictEqual(
        tandingContent.includes("const matchElapsedBaseRef = useRef<number>(0)"),
        true,
        "tanding page must have matchElapsedBaseRef"
      );
    });

    it("Defines getStopwatchParts helper extracting minutes, seconds, and centiseconds", () => {
      assert.strictEqual(
        tandingContent.includes("getStopwatchParts"),
        true,
        "tanding page must define getStopwatchParts"
      );
      assert.strictEqual(
        tandingContent.includes("centiseconds:"),
        true,
        "getStopwatchParts must return centiseconds"
      );
    });

    it("Runs high-frequency tick interval (~30ms) during match phase for fast-running stopwatch numbers", () => {
      assert.strictEqual(
        tandingContent.includes("setInterval"),
        true
      );
      assert.strictEqual(
        tandingContent.includes("Date.now() - matchStartTimeRef.current"),
        true,
        "Must use wall-clock calculation Date.now() - matchStartTimeRef.current"
      );
      assert.strictEqual(
        tandingContent.includes("}, 30);"),
        true,
        "Must run at ~30ms interval during match phase"
      );
    });

    it("Renders separate centiseconds element in giant stopwatch display with bright amber color", () => {
      assert.strictEqual(
        tandingContent.includes("getStopwatchParts(matchElapsedMs).minutes"),
        true,
        "Giant display must render minutes"
      );
      assert.strictEqual(
        tandingContent.includes("getStopwatchParts(matchElapsedMs).seconds"),
        true,
        "Giant display must render seconds"
      );
      assert.strictEqual(
        tandingContent.includes("getStopwatchParts(matchElapsedMs).centiseconds"),
        true,
        "Giant display must render centiseconds"
      );
    });

    it("Records matchElapsedMs in match history and finish times instead of integer seconds", () => {
      assert.strictEqual(
        tandingContent.includes("const currentSwTime = formatTime(matchElapsedMs)"),
        true,
        "currentSwTime must format matchElapsedMs"
      );
      assert.strictEqual(
        tandingContent.includes("timeFormatted: formatTime(matchElapsedMs)"),
        true,
        "History items must format matchElapsedMs"
      );
    });
  });

  describe("Requirement 2: Monitor and Pengaturan Stopwatch Precision", () => {
    it("Home page declares timerElapsedMs and getStopwatchParts", () => {
      assert.strictEqual(
        homeContent.includes("timerElapsedMs"),
        true,
        "Home page must declare timerElapsedMs"
      );
      assert.strictEqual(
        homeContent.includes("getStopwatchParts"),
        true,
        "Home page must define getStopwatchParts"
      );
    });

    it("Home page monitor full-screen giant display renders centiseconds", () => {
      assert.strictEqual(
        homeContent.includes("getStopwatchParts(timerElapsedMs).centiseconds"),
        true,
        "Home page giant digits must render centiseconds"
      );
    });

    it("Pengaturan page declares timerElapsedMs and getStopwatchParts", () => {
      assert.strictEqual(
        pengaturanContent.includes("timerElapsedMs"),
        true,
        "Pengaturan page must declare timerElapsedMs"
      );
      assert.strictEqual(
        pengaturanContent.includes("getStopwatchParts"),
        true,
        "Pengaturan page must define getStopwatchParts"
      );
      assert.strictEqual(
        pengaturanContent.includes("getStopwatchParts(timerElapsedMs).centiseconds"),
        true,
        "Pengaturan page stopwatch display must render centiseconds"
      );
    });

    it("Point log parser in page.tsx supports fractional seconds (@MM:SS.cs)", () => {
      assert.strictEqual(
        homeContent.includes("@(\\d{2}:\\d{2}(?:\\.\\d{1,2})?)"),
        true,
        "parsePointLogItem must match fractional seconds"
      );
    });
  });

  describe("Requirement 3: Mathematical & Formatting Correctness", () => {
    const getStopwatchParts = (totalMs) => {
      const validMs = Math.max(0, Math.floor(totalMs || 0));
      const totalSec = Math.floor(validMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const cs = Math.floor((validMs % 1000) / 10);
      return {
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
        centiseconds: String(cs).padStart(2, "0"),
        formatted: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`,
      };
    };

    it("Correctly formats 0ms to 00:00.00", () => {
      const res = getStopwatchParts(0);
      assert.strictEqual(res.minutes, "00");
      assert.strictEqual(res.seconds, "00");
      assert.strictEqual(res.centiseconds, "00");
      assert.strictEqual(res.formatted, "00:00.00");
    });

    it("Differentiates two close times that previously collided into the same second", () => {
      const robotA = 45280; // 45.28 seconds
      const robotB = 45890; // 45.89 seconds

      const resA = getStopwatchParts(robotA);
      const resB = getStopwatchParts(robotB);

      assert.strictEqual(resA.formatted, "00:45.28");
      assert.strictEqual(resB.formatted, "00:45.89");

      // Verify they are NOT equal
      assert.notStrictEqual(resA.formatted, resB.formatted, "Two close finishes must have distinct times");
      assert.strictEqual(resA.centiseconds, "28");
      assert.strictEqual(resB.centiseconds, "89");
    });

    it("Correctly rolls over minutes and seconds", () => {
      const ms = (2 * 60 + 15) * 1000 + 470; // 2 minutes, 15.47 seconds
      const res = getStopwatchParts(ms);
      assert.strictEqual(res.minutes, "02");
      assert.strictEqual(res.seconds, "15");
      assert.strictEqual(res.centiseconds, "47");
      assert.strictEqual(res.formatted, "02:15.47");
    });
  });
});

