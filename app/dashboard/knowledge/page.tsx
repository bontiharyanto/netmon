import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { KnowledgeWorkbench } from "@/components/knowledge/knowledge-workbench";

export default async function KnowledgePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  return <KnowledgeWorkbench canWrite={hasPermission(session.user.role, "kb.write")} />;
}
