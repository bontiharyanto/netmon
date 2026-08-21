import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { isKbCategory, slugify } from "@/lib/knowledge";

const schema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().max(20000).optional(),
  category: z.string().optional(),
  tags: z.string().max(200).optional(),
  published: z.boolean().optional(),
});

export async function GET(req: Request) {
  const gate = await requirePermission("kb.read");
  if (gate.error || !gate.session) return gate.error;
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  const publishedOnly = gate.session.user.role === "viewer";

  const items = await prisma.kb_article.findMany({
    where: {
      tenant_id: gate.session.user.tenantId,
      ...(publishedOnly ? { published: true } : {}),
      ...(category && isKbCategory(category) ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { tags: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updated_at: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("kb.write");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const base = slugify(parsed.data.title);
    let slug = base;
    let n = 1;
    while (await prisma.kb_article.findFirst({ where: { tenant_id: gate.session.user.tenantId, slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }

    const row = await prisma.kb_article.create({
      data: {
        tenant_id: gate.session.user.tenantId,
        title: parsed.data.title,
        slug,
        body: parsed.data.body ?? "",
        category: isKbCategory(parsed.data.category ?? "") ? parsed.data.category! : "general",
        tags: parsed.data.tags ?? "",
        published: parsed.data.published ?? true,
      },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `kb.create:${row.id}`);
    return NextResponse.json({ item: row });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
