import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("View Ranking Feature & Auto-Scrolling Modal Test Suite", () => {
  const pagePath = path.join(rootDir, "src/app/page.tsx");
  const modalPath = path.join(rootDir, "src/components/modals/ViewRankingModal.tsx");
  const modalIndexPath = path.join(rootDir, "src/components/modals/index.ts");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  const modalIndexContent = fs.readFileSync(modalIndexPath, "utf-8");

  test("Requirement 1: Dashboard header replaces 'Export CSV' button with 'View Ranking'", () => {
    // Check that 'View Ranking' button is present in the header
    assert.match(
      pageContent,
      /<button[^>]*onClick=\{[^}]*setIsViewRankingOpen\(true\)[^}]*\}[^>]*>[\s\S]*?<span>View Ranking<\/span>[\s\S]*?<\/button>/,
      "View Ranking button should be present and open the modal"
    );

    // Verify Trophy icon is used on the View Ranking button
    assert.match(
      pageContent,
      /<Trophy className="w-3\.5 h-3\.5 text-yellow-400" \/>/,
      "View Ranking button should feature the Trophy icon"
    );

    // Verify 'Export CSV' button is no longer rendered in the header
    assert.doesNotMatch(
      pageContent,
      /<button[^>]*>[\s\S]*?<span>Export CSV<\/span>[\s\S]*?<\/button>/,
      "Export CSV button should no longer exist in the navbar"
    );
  });

  test("Requirement 2: ViewRankingModal is registered in index and rendered in dashboard", () => {
    // Exported from modals/index.ts
    assert.match(
      modalIndexContent,
      /export\s+\{\s*ViewRankingModal\s*\}\s+from\s+["']\.\/ViewRankingModal["']/,
      "ViewRankingModal should be exported from src/components/modals/index.ts"
    );

    // Imported and declared in page.tsx
    assert.match(
      pageContent,
      /ViewRankingModal/,
      "ViewRankingModal should be imported in src/app/page.tsx"
    );
    assert.match(
      pageContent,
      /const \[isViewRankingOpen, setIsViewRankingOpen\] = useState<boolean>\(false\)/,
      "isViewRankingOpen state must be defined"
    );

    // Rendered with expected props
    assert.match(
      pageContent,
      /<ViewRankingModal[\s\S]*?isOpen=\{isViewRankingOpen\}[\s\S]*?onClose=\{[^}]*setIsViewRankingOpen\(false\)[^}]*\}[\s\S]*?participants=\{globallyRankedParticipants\}/,
      "ViewRankingModal should be rendered with isOpen, onClose, and participants"
    );
  });

  test("Requirement 3: Modal auto-scrolling is smooth, slow, and ping-pongs (down -> pause -> up -> pause)", () => {
    // Request animation frame loop
    assert.match(
      modalContent,
      /requestAnimationFrame/,
      "Modal should use requestAnimationFrame for smooth scrolling"
    );

    // Slow scrolling speed (between 0.4 and 1.2 px/frame)
    assert.match(
      modalContent,
      /const\s+speed\s*=\s*(0\.[0-9]+)/,
      "Modal should configure slow auto-scroll speed"
    );

    // Ping-pong direction switching (down and up)
    assert.match(
      modalContent,
      /scrollDirectionRef\.current\s*===\s*["']down["']/,
      "Modal should track downward scroll"
    );
    assert.match(
      modalContent,
      /scrollDirectionRef\.current\s*=\s*["']up["']/,
      "Modal should reverse to scrolling up when bottom is reached"
    );
    assert.match(
      modalContent,
      /scrollDirectionRef\.current\s*=\s*["']down["']/,
      "Modal should reverse to scrolling down when top is reached"
    );

    // Pause delay at boundaries (e.g. 3000ms pause)
    assert.match(
      modalContent,
      /setTimeout\(\(\)\s*=>\s*\{[\s\S]*?scrollDirectionRef\.current\s*=\s*["']up["'][\s\S]*?\}, 3000\)/,
      "Modal should pause at the bottom for reading"
    );
    assert.match(
      modalContent,
      /setTimeout\(\(\)\s*=>\s*\{[\s\S]*?scrollDirectionRef\.current\s*=\s*["']down["'][\s\S]*?\}, 3000\)/,
      "Modal should pause at the top for reading"
    );

    // Ensure scroll-smooth is NOT on the container (prevents CSS interpolation conflict with RAF)
    assert.doesNotMatch(
      modalContent,
      /className="[^"]*scroll-smooth[^"]*"/,
      "Container should not have CSS scroll-smooth class to avoid browser animation damping"
    );

    // Uses scrollPosRef accumulator for continuous subpixel precision
    assert.match(
      modalContent,
      /scrollPosRef\.current/,
      "Should use scrollPosRef accumulator for fluid subpixel motion"
    );
  });

  test("Requirement 4: User controls (Play/Pause auto-scroll, Fullscreen, ESC key, Spacebar)", () => {
    // Spacebar toggles auto-scroll
    assert.match(
      modalContent,
      /e\.key\s*===\s*["']\s*["']\s*\|\|\s*e\.code\s*===\s*["']Space["']/,
      "Space key should toggle auto-scroll pause/play"
    );

    // ESC key closes modal
    assert.match(
      modalContent,
      /e\.key\s*===\s*["']Escape["']/,
      "Escape key should close modal"
    );

    // Manual pause on mousewheel or touch
    assert.match(
      modalContent,
      /onWheel=\{handleUserWheel\}/,
      "Should listen to wheel events to pause temporarily on manual interaction"
    );
    assert.match(
      modalContent,
      /onTouchMove=\{handleUserWheel\}/,
      "Should listen to touch events to pause temporarily on manual interaction"
    );

    // Fullscreen support
    assert.match(
      modalContent,
      /requestFullscreen/,
      "Modal should support fullscreen display"
    );
  });

  test("Requirement 5: Complete participant ranking display with points and stage breakdown", () => {
    // Shows participant name, institution, and code
    assert.match(modalContent, /\{p\.name\}/);
    assert.match(modalContent, /\{p\.institution\}/);
    assert.match(modalContent, /\{p\.code\}/);

    // Shows total points formatted
    assert.match(modalContent, /p\.totalPoints/);

    // Top 3 badges (Crown or rank 1-3)
    assert.match(modalContent, /<Crown/);
    assert.match(modalContent, /#\$\{rank\}/);

    // Breakdown per stage
    assert.match(
      modalContent,
      /getParticipantStageRawScore\(p\.scores,\s*sIdx,\s*st\)/,
      "Modal should display score breakdown per stage"
    );
  });
});

