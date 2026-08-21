import Papa from "papaparse";
import * as XLSX from "xlsx";

export type TopologyRow = {
  from?: string;
  to?: string;
  status?: string;
  from_hostname?: string;
  to_hostname?: string;
  source?: string;
  target?: string;
};

export function parseTopologyFile(fileName: string, buffer: Buffer): TopologyRow[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".json")) {
    let json: unknown;
    try {
      json = JSON.parse(buffer.toString("utf8"));
    } catch {
      throw new Error("Invalid JSON topology file");
    }
    const record = json as Record<string, unknown>;
    const links = Array.isArray(json)
      ? json
      : Array.isArray(record.links)
        ? record.links
        : Array.isArray(record.edges)
          ? record.edges
          : Array.isArray(record.connections)
            ? record.connections
            : [];
    return (links as Record<string, string>[]).map((item) => ({
      from: item.from ?? item.source ?? item.from_hostname ?? item.src,
      to: item.to ?? item.target ?? item.to_hostname ?? item.dst,
      status: item.status ?? item.state ?? "up",
    }));
  }

  if (lower.endsWith(".csv")) {
    return Papa.parse<TopologyRow>(buffer.toString("utf8"), { header: true, skipEmptyLines: true }).data;
  }

  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<TopologyRow>(sheet);
}

export function endpointOf(row: TopologyRow) {
  const from = String(row.from ?? row.from_hostname ?? row.source ?? "").trim();
  const to = String(row.to ?? row.to_hostname ?? row.target ?? "").trim();
  const status = String(row.status ?? "up").toLowerCase();
  return { from, to, status: ["up", "down", "degraded"].includes(status) ? status : "up" };
}
