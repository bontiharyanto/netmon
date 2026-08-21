import { redirect } from "next/navigation";
import { NocBoard } from "@/components/dashboard/noc-board";
import { getAuthSession } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const data = await getDashboardOverview(session.user.tenantId);
  return <NocBoard data={data} />;
}
