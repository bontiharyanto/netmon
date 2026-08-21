import { NextResponse } from "next/server";
import { ingestEmailReply } from "@/lib/notify-inbound";

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const result = await ingestEmailReply(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbound email rejected";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
