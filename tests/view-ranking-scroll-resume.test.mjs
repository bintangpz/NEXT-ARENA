import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("ViewRankingModal Manual Scroll & Auto-Scroll Resume Test Suite", () => {
  const modalPath = path.join(rootDir, "src/components/modals/ViewRankingModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  test("Requirement 1: Isolates edge pause timer and user resume timer to prevent deadlocks", () => {
    // Both independent timeout refs exist
    assert.match(
      modalContent,
      /edgePauseTimeoutRef\s*=\s*useRef/,
      "edgePauseTimeoutRef must be declared independently"
    );
    assert.match(
      modalContent,
      /userResumeTimeoutRef\s*=\s*useRef/,
      "userResumeTimeoutRef must be declared independently"
    );

    // Manual scroll clears user resume timeout, not edge pause callback that sets direction
    assert.match(
      modalContent,
      /isPausedAtEdgeRef\s*=\s*useRef/,
      "isPausedAtEdgeRef must be tracked"
    );
    assert.match(
      modalContent,
      /isUserInteractingRef\s*=\s*useRef/,
      "isUserInteractingRef must be tracked"
    );
  });

  test("Requirement 2: Listens to scroll, wheel, touch, and pointer events for universal user interaction", () => {
    // Container binds onScroll, onWheel, onTouchMove, onPointerDown
    assert.match(
      modalContent,
      /onScroll=\{handleScroll\}/,
      "Container must listen to onScroll so scrollbar dragging and keyboard scrolls are captured"
    );
    assert.match(
      modalContent,
      /onWheel=\{handleUserWheel\}/,
      "Container must listen to onWheel"
    );
    assert.match(
      modalContent,
      /onTouchMove=\{handleUserWheel\}/,
      "Container must listen to onTouchMove"
    );
    assert.match(
      modalContent,
      /onPointerDown=\{handlePointerDown\}/,
      "Container must listen to onPointerDown"
    );
  });

  test("Requirement 3: Distinguishes programmatic auto-scroll from manual user scrolling", () => {
    assert.match(
      modalContent,
      /isProgrammaticScrollRef\s*=\s*useRef/,
      "Must track isProgrammaticScrollRef"
    );
    assert.match(
      modalContent,
      /isProgrammaticScrollRef\.current\s*=\s*true/,
      "Must flag programmatic scroll before updating container.scrollTop"
    );
    assert.match(
      modalContent,
      /if\s*\(\s*isProgrammaticScrollRef\.current\s*\)\s*\{[\s\S]*?isProgrammaticScrollRef\.current\s*=\s*false;\s*return;[\s\S]*?\}/,
      "handleScroll must ignore programmatic scroll ticks"
    );
  });

  test("Requirement 4: Auto-scroll resumes promptly (1.5s) after manual scroll and tracks direction", () => {
    // 1500ms resume delay (not 4000ms)
    assert.match(
      modalContent,
      /userResumeTimeoutRef\.current\s*=\s*setTimeout\(\(\)\s*=>\s*\{[\s\S]*?\},\s*1500\)/,
      "Must resume auto-scrolling 1.5 seconds after manual scrolling ends"
    );

    // Visual feedback indicator for manual scroll pause
    assert.match(
      modalContent,
      /isManualScrollPaused/,
      "Must track isManualScrollPaused state for visual feedback"
    );
    assert.match(
      modalContent,
      /Auto-Scroll:\s*Jeda Manual/,
      "Must display Jeda Manual feedback on button when user scrolls"
    );

    // Intelligently decides direction upon resume
    assert.match(
      modalContent,
      /pos\s*>=\s*maxScroll\s*-\s*10[\s\S]*?scrollDirectionRef\.current\s*=\s*["']up["']/,
      "Must switch to up if user stopped near bottom"
    );
    assert.match(
      modalContent,
      /pos\s*<=\s*10[\s\S]*?scrollDirectionRef\.current\s*=\s*["']down["']/,
      "Must switch to down if user stopped near top"
    );
  });
});
