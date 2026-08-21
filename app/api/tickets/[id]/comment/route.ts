import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { addTicketComment } from "@/lib/tickets";

const schema = z.object({
  body: z.string().min(2).max(4000),
  close: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  try {
    const comment = await addTicketComment({
      tenantId: gate.session.user.tenantId,
      ticketId: params.id,
      author: gate.session.user.email ?? "operator",
      body: parsed.data.body,
      close: parsed.data.close,
      direction: "outbound",
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `ticket.comment:${params.id}`);
    return NextResponse.json({ comment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to respond";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
