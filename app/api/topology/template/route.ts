import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";

const SAMPLE = `from,to,status
core-sw-01,core-sw-02,up
core-sw-01,edge-fw-01,up
edge-fw-01,edge-rtr-01,up
core-sw-02,acc-sw-lt7,up
acc-sw-lt7,ap-lt7-01,down
`;

export async function GET() {
  const gate = await requirePermission("topology.write");
  if (gate.error || !gate.session) return gate.error;

  return new NextResponse(SAMPLE, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=netmon-topology-template.csv",
    },
  });
}
