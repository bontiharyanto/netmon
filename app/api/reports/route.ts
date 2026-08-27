import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import {
  buildReport,
  parseReportFilters,
  parseReportRange,
  reportCsv,
  reportFilename,
  reportPdf,
  reportXlsx,
} from "@/lib/reports";
import { parseReportTemplate } from "@/lib/reports-types";

export async function GET(req: Request) {
  const gate = await requirePermission("reports.export");
  if (gate.error || !gate.session) return gate.error;

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const template = parseReportTemplate(url.searchParams.get("template"));
  const filters = parseReportFilters(url.searchParams);
  const { from, to } = parseReportRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const payload = await buildReport(gate.session.user.tenantId, gate.session.user.tenantSlug, from, to, {
    template,
    filters,
  });

  if (format !== "json") {
    await writeAudit(
      gate.session.user.tenantId,
      gate.session.user.id,
      `report.export:${payload.template}:${format}`,
    );
  }

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

  if (format === "csv") {
    return new NextResponse(reportCsv(payload), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${reportFilename(payload, "csv")}`,
      },
    });
  }

  return NextResponse.json(payload);
}
