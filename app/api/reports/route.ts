import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { buildReport, parseReportRange, reportFilename, reportPdf, reportXlsx } from "@/lib/reports";

export async function GET(req: Request) {
  const gate = await requirePermission("reports.export");
  if (gate.error || !gate.session) return gate.error;

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const { from, to } = parseReportRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const payload = await buildReport(gate.session.user.tenantId, gate.session.user.tenantSlug, from, to);

  if (format === "pdf") {
    return new NextResponse(reportPdf(payload), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${reportFilename(payload, "pdf")}`,
      },
    });
  }

  if (format === "xlsx" || format === "excel") {
    return new NextResponse(Buffer.from(reportXlsx(payload)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${reportFilename(payload, "xlsx")}`,
      },
    });
  }

  return NextResponse.json(payload);
}
