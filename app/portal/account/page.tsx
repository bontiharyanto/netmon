import { Suspense } from "react";
import { AccountView } from "@/components/account/account-view";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalAccountPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  return (
    <Suspense>
      <AccountView email={session.user.email} role={session.user.role} />
    </Suspense>
  );
}
