import { NextResponse } from "next/server";
import { db, getAllArenaData } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const soundKey = formData.get("soundKey") as string; // "prep" | "countdown" | "start" | "finish"
    const file = formData.get("file") as File | null;

    if (!soundKey || !["prep", "countdown", "start", "finish"].includes(soundKey)) {
      return NextResponse.json({ error: "Invalid soundKey" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const ext = path.extname(originalName) || ".mp3";
    const filename = `sound_${soundKey}_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "sounds");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const soundUrl = `/sounds/${filename}`;

    const insertOrUpdate = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    insertOrUpdate.run(`sound_${soundKey}_url`, soundUrl);
    insertOrUpdate.run(`sound_${soundKey}_name`, originalName);

    return NextResponse.json({
      success: true,
      soundKey,
      url: soundUrl,
      name: originalName,
      data: getAllArenaData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const soundKey = searchParams.get("soundKey");

    if (!soundKey || !["prep", "countdown", "start", "finish"].includes(soundKey)) {
      return NextResponse.json({ error: "Invalid soundKey" }, { status: 400 });
    }

    const insertOrUpdate = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    insertOrUpdate.run(`sound_${soundKey}_url`, "");
    insertOrUpdate.run(`sound_${soundKey}_name`, "");

    return NextResponse.json({
      success: true,
      soundKey,
      data: getAllArenaData(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

