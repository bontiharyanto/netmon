import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";
import { normalizeCityInput, resolveDeviceCity } from "@/lib/geo/indonesia-cities";

type Row = { hostname?: string; ip?: string; type?: string; location?: string; city?: string };

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(session.user.role, session.user.permissions)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File wajib" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Row[] = [];

  if (file.name.endsWith(".csv")) {
    rows = Papa.parse<Row>(buffer.toString("utf8"), { header: true, skipEmptyLines: true }).data;
  } else {
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Row>(sheet);
  }

  let imported = 0;
  for (const row of rows) {
    if (!row.hostname || !row.ip) continue;
    try {
      const device = await prisma.device.create({
        data: {
          tenant_id: session.user.tenantId,
          hostname: String(row.hostname),
          ip: String(row.ip),
          type: String(row.type ?? "unknown"),
          location: row.location ? String(row.location) : null,
          city:
            normalizeCityInput(row.city ? String(row.city) : null) ??
            resolveDeviceCity({
              city: row.city ? String(row.city) : null,
              location: row.location ? String(row.location) : null,
            })?.slug ??
            null,
        },
      });
      await prisma.sla.create({ data: { device_id: device.id } });
      imported += 1;
    } catch {
      continue;
    }
  }

  await writeAudit(session.user.tenantId, session.user.id, `device.import:${imported}`);
  return NextResponse.json({ imported });
}
