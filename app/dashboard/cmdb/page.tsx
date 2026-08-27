import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { CmdbManager } from "@/components/cmdb/cmdb-manager";

export default async function CmdbPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CMDB</h1>
        <p className="text-sm text-muted-foreground">
          Configuration items for this tenant. Operators can add, edit, and delete. Portal viewers stay read-only.
        </p>
      </div>
      <CmdbManager canWrite={hasPermission(session.user.role, "cmdb.write", session.user.permissions)} />
    </div>
  );
}
