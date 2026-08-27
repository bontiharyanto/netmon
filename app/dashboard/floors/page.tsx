import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { FloorPlansManager } from "@/components/floors/floor-plans-manager";

export default async function FloorsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Floor plans</h1>
        <p className="text-sm text-muted-foreground">
          Upload building floor plans and pin inventory devices by position. Coordinates are stored as
          percentages so pins stay aligned when the image scales.
        </p>
      </div>
      <FloorPlansManager canWrite={hasPermission(session.user.role, "assets.write", session.user.permissions)} />
    </div>
  );
}
