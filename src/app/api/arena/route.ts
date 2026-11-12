import { NextResponse } from "next/server";
import { getAllArenaData, resetArenaData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getAllArenaData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "reset") {
      const data = resetArenaData();
      return NextResponse.json({ success: true, message: "Database SQLite direset ke awal", data });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

