import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { isKbCategory, slugify } from "@/lib/knowledge";

const schema = z.object({
  title: z.string().min(3).max(160).optional(),
  body: z.string().max(20000).optional(),
  category: z.string().optional(),
  tags: z.string().max(200).optional(),
  published: z.boolean().optional(),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("kb.read");
  if (gate.error || !gate.session) return gate.error;
  const item = await prisma.kb_article.findFirst({
    where: {
      id: params.id,
      tenant_id: gate.session.user.tenantId,
      ...(gate.session.user.role === "viewer" ? { published: true } : {}),
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const gate = await requirePermission("kb.write");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const existing = await prisma.kb_article.findFirst({
      where: { id: params.id, tenant_id: gate.session.user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let slug = existing.slug;
    if (parsed.data.title && parsed.data.title !== existing.title) {
      const base = slugify(parsed.data.title);
      slug = base;
      let n = 1;
      while (
        await prisma.kb_article.findFirst({
          where: { tenant_id: gate.session.user.tenantId, slug, NOT: { id: existing.id } },
        })
      ) {
        n += 1;
        slug = `${base}-${n}`;
      }
    }

    const item = await prisma.kb_article.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title ?? existing.title,
        slug,
        body: parsed.data.body ?? existing.body,
        category: parsed.data.category && isKbCategory(parsed.data.category) ? parsed.data.category : existing.category,
        tags: parsed.data.tags ?? existing.tags,
        published: parsed.data.published ?? existing.published,
      },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `kb.update:${item.id}`);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("kb.write");
  if (gate.error || !gate.session) return gate.error;
  const existing = await prisma.kb_article.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.kb_article.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `kb.delete:${existing.id}`);
  return NextResponse.json({ ok: true });
}
