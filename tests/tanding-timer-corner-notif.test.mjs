import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Tanding Match Timer Box Corner Action Notifications", () => {
  const tandingPath = path.join(process.cwd(), "src/app/tanding/[id]/page.tsx");
  const content = fs.readFileSync(tandingPath, "utf-8");

  it("Maintains independent red (left) and blue (right) corner notification states inside timer box", () => {
    assert.ok(content.includes("const [cornerNotifs, setCornerNotifs] = useState<{"));
    assert.ok(content.includes("red: CornerActionNotif | null;"));
    assert.ok(content.includes("blue: CornerActionNotif | null;"));
    assert.ok(content.includes("showTimerCornerNotif("));
  });

  it("Formats scoring labels cleanly to Point, Cekpoint, Retry, or Finish only", () => {
    assert.ok(content.includes('if (lower.includes("finish")) return "Finish";'));
    assert.ok(content.includes('if (lower.includes("cekpoint") || lower.includes("checkpoint")) return "Cekpoint";'));
    assert.ok(content.includes('if (lower.includes("retry")) return "Retry";'));
    assert.ok(content.includes('return "Point";'));
  });

  it("Renders notifications inside the left and right edges of the Timer HUD box", () => {
    assert.ok(content.includes('isLeft ? "left-3.5 sm:left-6" : "right-3.5 sm:right-6"'));
    assert.ok(content.includes("Corner Action Notifications Inside Timer Box Edges"));
  });

  it("Uses cornerNotifs instead of top-center showPointToast when scoring or finishing", () => {
    assert.ok(!content.includes("showPointToast(`${teamName} (Sesi ${legToUse}):"));
    assert.ok(!content.includes("showPointToast(`${teamName}: ${delta"));
    assert.ok(!content.includes("Poin untuk ${teamName} kini terkunci."));
  });

  it("Does not render verbose finish-lock explanation banners or toasts on finished corners", () => {
    assert.ok(!content.includes("Sisi ini sudah FINISH pada"));
    assert.ok(!content.includes("Tidak dapat menambah poin lagi."));
    assert.ok(!content.includes("Skor telah terkunci."));
    assert.ok(content.includes("{isScoringLocked && !isFinished && ("));
  });
});
