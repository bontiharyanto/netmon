import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export default async function PortalKnowledgeDetail({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const item = await prisma.kb_article.findFirst({
    where: { id: params.id, tenant_id: session.user.tenantId, published: true },
  });
  if (!item) notFound();

  return (
    <article className="space-y-4">
      <Link href="/portal/knowledge" className="text-sm text-muted-foreground hover:text-foreground">
        ← Knowledge
      </Link>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.category}</p>
        <h1 className="mt-1 text-2xl font-semibold">{item.title}</h1>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{item.body}</pre>
    </article>
  );
}
