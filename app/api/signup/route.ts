import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const schema = z.object({
  company: z.string().min(2),
  slug: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data onboarding tidak valid" }, { status: 400 });
  }

  const slug = slugify(parsed.data.slug);
  const exists = await prisma.tenant.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ error: "Slug sudah dipakai" }, { status: 409 });

  const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (emailTaken) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

  const tenant = await prisma.tenant.create({
    data: {
      name: parsed.data.company,
      slug,
      domain: `${slug}.netmon.click`,
      management_email: parsed.data.email.toLowerCase(),
      plan: "cloud_basic",
      subscription: { create: { status: "trialing" } },
      users: {
        create: {
          email: parsed.data.email.toLowerCase(),
          name: parsed.data.name,
          role: "admin",
          password_hash: await bcrypt.hash(parsed.data.password, 10),
        },
      },
      dashboards: {
        create: {
          name: "Overview",
          layout: { widgets: [{ id: "w1", type: "availability" }, { id: "w2", type: "alerts" }] },
        },
      },
    },
  });

  return NextResponse.json({ id: tenant.id, slug: tenant.slug });
}
