import { NextResponse } from "next/server";
import { ingestInboundTicket } from "@/lib/tickets";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const payload = await req.json().catch(() => ({}));
    const ticket = await ingestInboundTicket(params.token, payload);
    return NextResponse.json({ ok: true, id: ticket.id, status: ticket.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbound rejected";
    const status = message.includes("Unknown") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
