import { NextResponse } from "next/server";
import { db, getAllArenaData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const trimmed = name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Nama kategori tidak boleh kosong" }, { status: 400 });
    }

    db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(trimmed);
    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "Missing category name" }, { status: 400 });
    }

    const countRow = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
    if (countRow.count <= 1) {
      return NextResponse.json({ error: "Minimal harus ada 1 kategori lomba" }, { status: 400 });
    }

    db.prepare("DELETE FROM categories WHERE name = ?").run(name);

    // Re-assign any participants that belonged to the deleted category to the remaining valid category
    const remainingCat = db.prepare("SELECT name FROM categories ORDER BY id ASC LIMIT 1").get() as { name: string } | undefined;
    if (remainingCat) {
      db.prepare("UPDATE participants SET category = ? WHERE category = ?").run(remainingCat.name, name);
    }

    return NextResponse.json({ success: true, data: getAllArenaData() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

