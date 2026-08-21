import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const ROOT_HOSTS = new Set([
  "netmon.click",
  "www.netmon.click",
  "localhost",
  "127.0.0.1",
]);

export function hostFromHeaders(headerList = headers()) {
  return (
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost"
  )
    .split(":")[0]
    .toLowerCase();
}

export function slugFromHost(host: string) {
  if (ROOT_HOSTS.has(host)) return null;
  if (host.endsWith(".netmon.click")) {
    const slug = host.replace(".netmon.click", "");
    return slug && slug !== "www" ? slug : null;
  }
  return null;
}

export async function resolveTenantByHost(host = hostFromHeaders()) {
  const slug = slugFromHost(host);
  if (slug) {
    return prisma.tenant.findUnique({ where: { slug } });
  }

  return prisma.tenant.findFirst({
    where: { OR: [{ domain: host }, { slug: "demo" }] },
  });
}

export function tenantWhere(tenantId: string) {
  return { tenant_id: tenantId };
}
