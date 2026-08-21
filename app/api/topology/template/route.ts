import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/rbac";
import { getTopologyExport, topologyCsv } from "@/lib/topology-export";

const SAMPLE: { from: string; to: string; status: string }[] = [
  { from: "core-sw-01", to: "core-sw-02", status: "up" },
  { from: "core-sw-01", to: "edge-fw-01", status: "up" },
];

export async function GET(req: Request) {
  const gate = await requirePermission("topology.read");
  if (gate.error || !gate.session) return gate.error;

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const filled = url.searchParams.get("filled") !== "0";
  const slug = gate.session.user.tenantSlug;
  const exported = await getTopologyExport(gate.session.user.tenantId);
  const links = filled && exported.linkRows.length ? exported.linkRows : SAMPLE;

  if (format === "xlsx" || format === "excel") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(links), "links");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exported.deviceRows), "devices");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=netmon-topology-${slug}.xlsx`,
      },
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("NETMON topology", 14, 16);
    doc.setFontSize(10);
    doc.text(`${slug} · ${links.length} links · ${new Date().toISOString().slice(0, 10)}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [["from", "to", "status"]],
      body: links.map((row) => [row.from, row.to, row.status]),
    });
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["hostname", "ip", "type", "status"]],
      body: exported.deviceRows.map((row) => [row.hostname, row.ip, row.type, row.status]),
    });
    const bytes = doc.output("arraybuffer");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=netmon-topology-${slug}.pdf`,
      },
    });
  }

  return new NextResponse(topologyCsv(links), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=netmon-topology-${slug}.csv`,
    },
  });
}
