export type ChannelField = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  type?: "text" | "password" | "number";
};

export type ChannelKind = {
  type: string;
  name: string;
  blurb: string;
  group: "Messaging" | "Email" | "On-call" | "Infrastructure";
  fields: ChannelField[];
};

export const CHANNEL_CATALOG: ChannelKind[] = [
  {
    type: "email",
    name: "Email (SMTP)",
    blurb: "Alert from noreply@netmon.click or your corporate SMTP.",
    group: "Email",
    fields: [
      { key: "host", label: "SMTP host", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Port", placeholder: "587", type: "number" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password", secret: true, type: "password" },
      { key: "from", label: "From", placeholder: "noreply@netmon.click" },
      { key: "to", label: "Recipients", placeholder: "noc@company.com, oncall@company.com" },
    ],
  },
  {
    type: "slack",
    name: "Slack",
    blurb: "Incoming webhook to a NOC channel.",
    group: "Messaging",
    fields: [
      { key: "webhook_url", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/…", secret: true },
      { key: "channel", label: "Channel", placeholder: "#netmon-alerts" },
    ],
  },
  {
    type: "teams",
    name: "Microsoft Teams",
    blurb: "Workflows / incoming webhook connector.",
    group: "Messaging",
    fields: [{ key: "webhook_url", label: "Webhook URL", secret: true, placeholder: "https://outlook.office.com/webhook/…" }],
  },
  {
    type: "telegram",
    name: "Telegram",
    blurb: "Bot API to a NOC group or on-call chat.",
    group: "Messaging",
    fields: [
      { key: "bot_token", label: "Bot token", secret: true, type: "password" },
      { key: "chat_id", label: "Chat ID", placeholder: "-1001234567890" },
    ],
  },
  {
    type: "whatsapp",
    name: "WhatsApp",
    blurb: "Meta Cloud API or your BSP gateway.",
    group: "Messaging",
    fields: [
      { key: "api_url", label: "API URL", placeholder: "https://graph.facebook.com/v20.0/…/messages" },
      { key: "token", label: "Access token", secret: true, type: "password" },
      { key: "from", label: "From (phone id)" },
      { key: "to", label: "To", placeholder: "+62812…" },
    ],
  },
  {
    type: "discord",
    name: "Discord",
    blurb: "Server webhook for engineering rooms.",
    group: "Messaging",
    fields: [{ key: "webhook_url", label: "Webhook URL", secret: true }],
  },
  {
    type: "webhook",
    name: "Generic webhook",
    blurb: "POST JSON to any automation, SOAR, or ticket system.",
    group: "Infrastructure",
    fields: [
      { key: "url", label: "Endpoint URL", placeholder: "https://hooks.company.com/netmon" },
      { key: "secret", label: "HMAC secret", secret: true, type: "password" },
      { key: "method", label: "Method", placeholder: "POST" },
    ],
  },
  {
    type: "sms",
    name: "SMS",
    blurb: "Twilio-compatible critical pages.",
    group: "On-call",
    fields: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth token", secret: true, type: "password" },
      { key: "from", label: "From number" },
      { key: "to", label: "To numbers", placeholder: "+62…, +62…" },
    ],
  },
  {
    type: "pagerduty",
    name: "PagerDuty",
    blurb: "Events API v2 routing key.",
    group: "On-call",
    fields: [{ key: "routing_key", label: "Integration key", secret: true, type: "password" }],
  },
  {
    type: "snmp",
    name: "SNMP trap",
    blurb: "Forward traps to an existing NMS collector.",
    group: "Infrastructure",
    fields: [
      { key: "host", label: "Collector host", placeholder: "10.10.1.50" },
      { key: "port", label: "Port", placeholder: "162", type: "number" },
      { key: "community", label: "Community", secret: true },
      { key: "version", label: "Version", placeholder: "v2c" },
    ],
  },
];

export const SECRET_KEYS = CHANNEL_CATALOG.flatMap((c) => c.fields.filter((f) => f.secret).map((f) => f.key));
export const SEVERITY_OPTIONS = ["critical", "warning", "info"] as const;
