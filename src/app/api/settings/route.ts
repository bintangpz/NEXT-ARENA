import { NextResponse } from "next/server";
import { db, getAllArenaData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getAllArenaData();
    return NextResponse.json({ success: true, settings: data.settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const insertOrUpdate = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [k, v] of Object.entries(body)) {
      insertOrUpdate.run(k, String(v));
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
