import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export default async function PortalKnowledgePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const items = await prisma.kb_article.findMany({
    where: { tenant_id: session.user.tenantId, published: true },
    orderBy: { updated_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge</h1>
        <p className="text-sm text-muted-foreground">Published runbooks for your tenant.</p>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No published articles.</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/portal/knowledge/${item.id}`}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40"
          >
            <span>
              <span className="text-sm font-medium">{item.title}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">{item.category}</span>
            </span>
            <Badge variant="ok">Published</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
