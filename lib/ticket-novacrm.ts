type Connector = {
  base_url: string;
  api_user: string;
  config: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function origin(url: string) {
  return url.replace(/\/$/, "");
}

function slugFrom(connector: Connector, fromUrl = "") {
  const config = asRecord(connector.config);
  return String(config.tenant_slug ?? connector.api_user ?? fromUrl)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

export function novaCrmContext(connector: Connector) {
  const raw = origin(connector.base_url || "https://novacrm.click");
  const match = raw.match(/^(https?:\/\/[^/]+)(?:\/api\/v\d+\/t\/([^/]+))?/i);
  const host = match?.[1] ?? raw;
  const slug = slugFrom(connector, match?.[2] ?? "");
  return {
    host,
    slug,
    health: slug ? `${host}/api/v1/t/${slug}/health` : `${host}/api/health`,
    alerts: slug ? `${host}/api/v1/t/${slug}/webhooks/alerts` : `${host}/api/webhooks/alerts`,
    ticketUrl: (id: string) => `${host}/tickets/${id}`,
  };
}

export function novaCrmHeaders(secret: string, slug: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["X-Webhook-Secret"] = secret;
    headers.Authorization = `Bearer ${secret}`;
  }
  if (slug) headers["X-Tenant-Id"] = slug;
  return headers;
}

export function novaCrmAlertBody(payload: {
  title: string;
  body: string;
  priority: string;
  fingerprint?: string;
  instance?: string;
  resolved?: boolean;
}) {
  return {
    source: "NETMON",
    title: payload.title,
    alert: payload.title,
    description: payload.body,
    message: payload.body,
    severity: payload.priority,
    priority: payload.priority,
    instance: payload.instance ?? "",
    host: payload.instance ?? "",
    fingerprint: payload.fingerprint ?? "",
    status: payload.resolved ? "resolved" : "firing",
  };
}

export function parseNovaCrmTicket(json: unknown) {
  const root = asRecord(json);
  const data = root.data;
  const row = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  const ticketId = String(row.ticketId ?? row.id ?? "");
  const number = String(row.number ?? "");
  return {
    ticketId,
    number,
    external_id: number || ticketId,
  };
}
