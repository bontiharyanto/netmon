import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [devices, alerts, slas] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.alert.findMany({ where: { tenant_id: session.user.tenantId }, include: { device: true } }),
    prisma.sla.findMany({ include: { device: true } }),
  ]);
  const tenantSlas = slas.filter((row) => row.device.tenant_id === session.user.tenantId);

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("NETMON Operations Report", 14, 18);
  doc.setFontSize(10);
  doc.text(`Tenant: ${session.user.tenantSlug} · ${new Date().toISOString()}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [["Hostname", "IP", "Status"]],
    body: devices.map((d) => [d.hostname, d.ip, d.status]),
  });
  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [["Device", "SLA 30d"]],
    body: tenantSlas.map((s) => [s.device.hostname, `${s.uptime_30d.toFixed(2)}%`]),
  });
  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
    head: [["Event", "Device", "Status"]],
    body: alerts.map((a) => [a.event, a.device.hostname, a.status]),
  });

  const bytes = doc.output("arraybuffer");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=netmon-report.pdf",
    },
  });
}
