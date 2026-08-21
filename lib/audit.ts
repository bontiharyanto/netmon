import { prisma } from "@/lib/prisma";

export async function writeAudit(tenantId: string, userId: string, action: string) {
  await prisma.audit_log.create({
    data: { tenant_id: tenantId, user_id: userId, action },
  });
}
