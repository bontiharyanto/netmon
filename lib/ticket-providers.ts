export type TicketField = {
  key: string;
  label: string;
  placeholder?: string;
};

export type TicketProvider = {
  id: string;
  name: string;
  blurb: string;
  user_label: string;
  key_label: string;
  base_placeholder: string;
  fields: TicketField[];
};

export const TICKET_PROVIDERS: TicketProvider[] = [
  {
    id: "netmon",
    name: "NETMON Helpdesk",
    blurb: "Local tickets inside NETMON. No external ITSM required. Used for auto-open.",
    user_label: "Owner (optional)",
    key_label: "Unused",
    base_placeholder: "",
    fields: [],
  },
  {
    id: "novacrm",
    name: "NovaCRM",
    blurb: "Open incidents on novacrm.click from NETMON alerts. Optionally sync CMDB as assets.",
    user_label: "Tenant slug",
    key_label: "Alert webhook secret",
    base_placeholder: "https://novacrm.click",
    fields: [{ key: "account_id", label: "NovaCRM account UUID (optional)", placeholder: "Internal if empty" }],
  },
  {
    id: "jira",
    name: "Jira",
    blurb: "Create and comment on Jira issues. Receive Jira webhooks.",
    user_label: "Email",
    key_label: "API token",
    base_placeholder: "https://company.atlassian.net",
    fields: [
      { key: "project_key", label: "Project key", placeholder: "NOC" },
      { key: "issue_type", label: "Issue type", placeholder: "Incident" },
    ],
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    blurb: "Open incidents and post work notes. Receive table webhooks.",
    user_label: "Username",
    key_label: "Password",
    base_placeholder: "https://instance.service-now.com",
    fields: [{ key: "table", label: "Table", placeholder: "incident" }],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    blurb: "Create tickets and public comments. Receive Zendesk triggers.",
    user_label: "Agent email",
    key_label: "API token",
    base_placeholder: "https://company.zendesk.com",
    fields: [],
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    blurb: "Helpdesk tickets with status sync both ways.",
    user_label: "Email (optional)",
    key_label: "API key",
    base_placeholder: "https://company.freshdesk.com",
    fields: [{ key: "requester_email", label: "Requester email", placeholder: "noc@company.com" }],
  },
  {
    id: "glpi",
    name: "GLPI",
    blurb: "ITSM tickets via the GLPI REST API.",
    user_label: "User token (optional)",
    key_label: "App token",
    base_placeholder: "https://glpi.company.com/apirest.php",
    fields: [],
  },
  {
    id: "osticket",
    name: "osTicket",
    blurb: "HTTP API tickets for on-prem helpdesks.",
    user_label: "Email",
    key_label: "API key",
    base_placeholder: "https://helpdesk.company.com",
    fields: [{ key: "topic_id", label: "Help topic ID", placeholder: "1" }],
  },
  {
    id: "custom",
    name: "Custom webhook",
    blurb: "POST JSON to any ITSM, SOAR, or internal ticketing API.",
    user_label: "Username (optional)",
    key_label: "Bearer / HMAC secret",
    base_placeholder: "https://itsm.company.com/api/tickets",
    fields: [{ key: "auth_header", label: "Auth header name", placeholder: "Authorization" }],
  },
];

export const AUTO_TICKET_EVENTS = [
  { id: "*", label: "All firing events" },
  { id: "device_down", label: "Device down" },
  { id: "high_latency", label: "High latency" },
  { id: "packet_loss", label: "Packet loss" },
  { id: "disk_almost_full", label: "Disk almost full" },
  { id: "interface_flapping", label: "Interface flapping" },
] as const;

export const AUTO_TICKET_SEVERITIES = ["critical", "warning"] as const;

export const TICKET_DIRECTIONS = [
  { id: "both", label: "Receive and respond" },
  { id: "inbound", label: "Receive only" },
  { id: "outbound", label: "Respond / open only" },
] as const;

export function getTicketProvider(id?: string | null) {
  return TICKET_PROVIDERS.find((item) => item.id === id);
}

export function appBaseUrl() {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function inboundWebhookUrl(token: string) {
  return `${appBaseUrl()}/api/tickets/inbound/${token}`;
}

export function cfg(config: unknown, key: string, fallback = "") {
  if (!config || typeof config !== "object" || Array.isArray(config)) return fallback;
  const value = (config as Record<string, unknown>)[key];
  return value == null ? fallback : String(value);
}

export function cfgEnabled(config: unknown, key: string, defaultOn = true) {
  const raw = cfg(config, key, defaultOn ? "true" : "false").trim().toLowerCase();
  if (!raw) return defaultOn;
  return raw !== "false" && raw !== "0" && raw !== "off" && raw !== "no";
}
