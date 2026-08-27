import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { isAllowedFloorImage, normalizeImageMime } from "@/lib/floors";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const floor = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    select: { image_data: true, image_mime: true },
  });
  if (!floor?.image_data || !floor.image_mime) {
    return NextResponse.json({ error: "No floor plan image" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(floor.image_data), {
    headers: {
      "Content-Type": floor.image_mime,
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const mime = normalizeImageMime(file.type);
  if (!isAllowedFloorImage(mime, file.size)) {
    return NextResponse.json(
      { error: "Use JPG, PNG, or WebP up to 8 MB" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.floor.update({
    where: { id: existing.id },
    data: {
      image_mime: mime,
      image_data: buffer,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `floor.image:${existing.name}`);
  return NextResponse.json({ ok: true, image_url: `/api/floors/${existing.id}/image` });
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.floor.update({
    where: { id: existing.id },
    data: { image_mime: null, image_data: null },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `floor.image.clear:${existing.name}`);
  return NextResponse.json({ ok: true });
}
