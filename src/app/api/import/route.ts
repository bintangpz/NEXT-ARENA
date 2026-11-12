import { NextResponse } from "next/server";
import { db, getAllArenaData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { csvText } = await req.json();
    if (!csvText?.trim()) {
      return NextResponse.json({ error: "CSV text is empty" }, { status: 400 });
    }

    const lines = csvText
      .trim()
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);

    const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    const insertParticipant = db.prepare(`
      INSERT INTO participants (
        id, code, name, institution, city, category, status,
        babak1, babak2, babak3,
        criteria_teknis, criteria_inovasi, criteria_kecepatan, criteria_presentasi,
        members_json, total_points, previous_rank, last_updated, avatar_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const existingCount = (db.prepare("SELECT COUNT(*) as count FROM participants").get() as { count: number }).count;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
      if (parts.length < 2 || parts[0].toLowerCase().includes("nama")) continue;

      const name = parts[0];
      const institution = parts[1] || "Instansi Nusantara";
      const city = parts[2] || "Indonesia";
      const category = parts[3] || "Cyber Security & CTF";
      const b1 = Number(parts[4]) || 750;
      const b2 = Number(parts[5]) || 750;
      const b3 = Number(parts[6]) || 700;
      const total = b1 + b2 + b3;
      const perCrit = Math.round(b3 / 4);

      insertCat.run(category);

      const id = `nxt-imp-${Date.now()}-${i}`;
      const code = `NXT-${200 + existingCount + i}`;
      const members = [{ name: "Ketua Tim", role: "Team Captain" }];

      insertParticipant.run(
        id,
        code,
        name,
        institution,
        city,
        category,
        "Aktif",
        b1,
        b2,
        b3,
        perCrit,
        perCrit,
        perCrit,
        b3 - perCrit * 3,
        JSON.stringify(members),
        total,
        existingCount + i + 1,
        "Baru saja (Import CSV)",
        "from-amber-400 to-orange-500"
      );

      importedCount++;
    }

    if (importedCount > 0) {
      db.prepare(`
        INSERT INTO point_logs (id, participant_id, participant_name, category, delta, stage_label, timestamp)
        VALUES (?, '', ?, 'Umum', ?, 'Import Massal CSV Berhasil', 'Baru saja')
      `).run(`log-${Date.now()}`, `${importedCount} Tim Baru`, importedCount);
    }

    return NextResponse.json({ success: true, importedCount, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

