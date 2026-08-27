import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { FloorPlansManager } from "@/components/floors/floor-plans-manager";

export default async function PortalFloorsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Floor plans</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of building floors and device placements for your tenant.
        </p>
      </div>
      <FloorPlansManager canWrite={false} />
    </div>
  );
}
