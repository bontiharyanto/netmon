import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { CHANNEL_CATALOG } from "../lib/channels";

const prisma = new PrismaClient();

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function jitter(base: number, spread = 10) {
  return Math.max(1, Math.min(99, Number((base + (Math.random() * spread * 2 - spread)).toFixed(1))));
}

async function seedMetrics(deviceId: string, down: boolean) {
  const points = [];
  for (let i = 24; i >= 0; i -= 1) {
    points.push({
      device_id: deviceId,
      ts: hoursAgo(i),
      cpu_percent: down ? 0 : jitter(28),
      ram_percent: down ? 0 : jitter(52),
      disk_percent: down ? 0 : jitter(61, 6),
    });
  }
  await prisma.metric.createMany({ data: points });
}

async function main() {
  const password = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!", 10);

  await prisma.kb_article.deleteMany();
  await prisma.ticket_comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.ticket_connector.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.device_link.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.cmdb_ci.deleteMany();
  await prisma.notify_channel.deleteMany();
  await prisma.ai_setting.deleteMany();
  await prisma.sla.deleteMany();
  await prisma.audit_log.deleteMany();
  await prisma.dashboard.deleteMany();
  await prisma.device.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const demo = await prisma.tenant.create({
    data: {
      name: "PT Demo Nusantara",
      slug: "demo",
      domain: "demo.netmon.click",
      management_email: "ops@demo.netmon.click",
      brand_color: "#00E5C3",
      plan: "cloud_pro",
      status: "active",
      device_limit: 250,
    },
  });

  const acme = await prisma.tenant.create({
    data: {
      name: "Acme Fiber",
      slug: "acme",
      domain: "acme.netmon.click",
      management_email: "noc@acme.netmon.click",
      brand_color: "#38BDF8",
      plan: "cloud_basic",
      status: "active",
      device_limit: 50,
    },
  });

  const jakarta = await prisma.tenant.create({
    data: {
      name: "Jakarta Metro ISP",
      slug: "jakarta",
      domain: "jakarta.netmon.click",
      management_email: "noc@jakarta.netmon.click",
      brand_color: "#F59E0B",
      plan: "cloud_enterprise",
      status: "active",
      device_limit: 500,
    },
  });

  await prisma.subscription.createMany({
    data: [
      { tenant_id: demo.id, status: "active" },
      { tenant_id: acme.id, status: "trialing" },
      { tenant_id: jakarta.id, status: "active" },
    ],
  });

  for (const tenant of [demo, acme, jakarta]) {
    await prisma.notify_channel.createMany({
      data: CHANNEL_CATALOG.map((kind) => ({
        tenant_id: tenant.id,
        type: kind.type,
        name: kind.name,
        enabled: tenant.id === demo.id && kind.type === "email",
        config:
          kind.type === "email"
            ? { host: "smtp.netmon.click", port: "587", from: "noreply@netmon.click", to: tenant.management_email, reply_to: tenant.management_email }
            : { reply_to: tenant.management_email },
        severities: kind.type === "sms" || kind.type === "pagerduty" ? "critical" : "critical,warning",
      })),
    });
  }

  await prisma.ai_setting.createMany({
    data: [demo, acme, jakarta].map((tenant) => ({
      tenant_id: tenant.id,
      enabled: true,
      mode: "rules",
      provider: "ollama",
      base_url: "http://127.0.0.1:11434/v1",
      model: "llama3.1",
      copilot_enabled: true,
      insights_enabled: true,
    })),
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenant_id: demo.id,
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@netmon.click",
        name: "Haryanto Superadmin",
        role: "superadmin",
        password_hash: password,
      },
    }),
    prisma.user.create({
      data: {
        tenant_id: demo.id,
        email: "admin@demo.netmon.click",
        name: "Rina NOC Admin",
        role: "admin",
        password_hash: password,
      },
    }),
    prisma.user.create({
      data: {
        tenant_id: demo.id,
        email: "operator@demo.netmon.click",
        name: "Budi Operator",
        role: "operator",
        password_hash: password,
      },
    }),
    prisma.user.create({
      data: {
        tenant_id: demo.id,
        email: "viewer@demo.netmon.click",
        name: "Sari Viewer",
        role: "viewer",
        password_hash: password,
      },
    }),
    prisma.user.create({
      data: {
        tenant_id: acme.id,
        email: "admin@acme.netmon.click",
        name: "Acme Admin",
        role: "admin",
        password_hash: password,
      },
    }),
    prisma.user.create({
      data: {
        tenant_id: jakarta.id,
        email: "admin@jakarta.netmon.click",
        name: "Jakarta NOC",
        role: "admin",
        password_hash: password,
      },
    }),
  ]);

  const demoUsers = users.filter((user) => user.tenant_id === demo.id);
  await prisma.notification.createMany({
    data: demoUsers.flatMap((user) => [
      {
        tenant_id: demo.id,
        user_id: user.id,
        title: "CRITICAL ap-lt7-01 down",
        body: "Access point on HQ Lantai-7 is not responding. Reply by email to ops@demo.netmon.click.",
        kind: "alert",
        severity: "critical",
        created_at: hoursAgo(3),
      },
      {
        tenant_id: demo.id,
        user_id: user.id,
        title: "Ticket received · NOC-1042",
        body: "Jira accepted the incident. Reply from any channel uses the same Reply-To address.",
        kind: "ticket",
        severity: "critical",
        created_at: hoursAgo(2.5),
      },
    ]),
  });

  const demoDevices = [
    { hostname: "core-sw-01", ip: "10.10.1.1", type: "switch", status: "up", vendor: "Cisco", location: "DC-A / Rack-01", city: "jakarta" },
    { hostname: "core-sw-02", ip: "10.10.1.2", type: "switch", status: "up", vendor: "Cisco", location: "DC-A / Rack-01", city: "jakarta" },
    { hostname: "edge-fw-01", ip: "10.10.1.10", type: "firewall", status: "up", vendor: "Fortinet", location: "DC-A / Edge", city: "jakarta" },
    { hostname: "edge-rtr-01", ip: "10.10.1.11", type: "router", status: "up", vendor: "MikroTik", location: "DC-A / Edge", city: "jakarta" },
    { hostname: "acc-sw-lt3", ip: "10.10.2.10", type: "switch", status: "degraded", vendor: "HPE", location: "HQ / Lantai-3", city: "jakarta" },
    { hostname: "acc-sw-lt7", ip: "10.10.2.11", type: "switch", status: "up", vendor: "HPE", location: "HQ / Lantai-7", city: "jakarta" },
    { hostname: "ap-lt7-01", ip: "10.10.4.21", type: "access-point", status: "down", vendor: "Ubiquiti", location: "HQ / Lantai-7", city: "jakarta" },
    { hostname: "ap-lt7-02", ip: "10.10.4.22", type: "access-point", status: "up", vendor: "Ubiquiti", location: "HQ / Lantai-7", city: "jakarta" },
    { hostname: "srv-nms-01", ip: "10.10.3.5", type: "server", status: "up", vendor: "Dell", location: "DC-A / Compute", city: "jakarta" },
    { hostname: "srv-app-01", ip: "10.10.3.6", type: "server", status: "up", vendor: "Dell", location: "DC-A / Compute", city: "jakarta" },
    { hostname: "srv-db-01", ip: "10.10.3.7", type: "server", status: "up", vendor: "HP", location: "DC-A / Compute", city: "jakarta" },
    { hostname: "cctv-nvr-01", ip: "10.10.5.8", type: "nvr", status: "unknown", vendor: "Hikvision", location: "Branch-BSD", city: "tangerang-selatan" },
    { hostname: "olt-pon-01", ip: "10.10.6.1", type: "olt", status: "up", vendor: "ZTE", location: "POP-Cibubur", city: "jakarta" },
    { hostname: "br-bsd-rtr", ip: "10.20.1.1", type: "router", status: "degraded", vendor: "MikroTik", location: "Branch-BSD", city: "tangerang-selatan" },
  ];

  const acmeDevices = [
    { hostname: "acme-core-01", ip: "172.16.1.1", type: "switch", status: "up", vendor: "Cisco", location: "POP-Pusat", city: "jakarta" },
    { hostname: "acme-fw-01", ip: "172.16.1.2", type: "firewall", status: "up", vendor: "Sophos", location: "POP-Pusat", city: "jakarta" },
    { hostname: "acme-olt-02", ip: "172.16.2.10", type: "olt", status: "down", vendor: "Huawei", location: "POP-Bekasi", city: "bekasi" },
  ];

  const jakartaDevices = [
    { hostname: "jkt-bb-rtr-01", ip: "103.190.214.10", type: "router", status: "up", vendor: "Juniper", location: "NARUS", city: "jakarta" },
    { hostname: "jkt-bb-rtr-02", ip: "103.190.214.11", type: "router", status: "up", vendor: "Juniper", location: "NEO", city: "jakarta" },
    { hostname: "jkt-pe-01", ip: "103.190.214.20", type: "router", status: "degraded", vendor: "Cisco", location: "Kuningan", city: "jakarta" },
  ];

  async function insertDevices(
    tenantId: string,
    items: typeof demoDevices,
  ) {
    const created = [];
    for (const item of items) {
      const row = await prisma.device.create({
        data: {
          ...item,
          tenant_id: tenantId,
          last_seen: item.status === "down" ? hoursAgo(6) : hoursAgo(0.1),
        },
      });
      created.push(row);
      await prisma.sla.create({
        data: {
          device_id: row.id,
          uptime_30d:
            item.status === "down" ? 96.42 : item.status === "degraded" ? 98.71 : item.status === "unknown" ? 99.1 : 99.98,
        },
      });
      await seedMetrics(row.id, item.status === "down");
    }
    return created;
  }

  const demoRows = await insertDevices(demo.id, demoDevices);
  const acmeRows = await insertDevices(acme.id, acmeDevices);
  await insertDevices(jakarta.id, jakartaDevices);

  const byHost = Object.fromEntries(demoRows.map((d) => [d.hostname, d]));

  await prisma.device_link.createMany({
    data: [
      { tenant_id: demo.id, from_device_id: byHost["core-sw-01"].id, to_device_id: byHost["core-sw-02"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-01"].id, to_device_id: byHost["edge-fw-01"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["edge-fw-01"].id, to_device_id: byHost["edge-rtr-01"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-02"].id, to_device_id: byHost["acc-sw-lt3"].id, status: "degraded" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-02"].id, to_device_id: byHost["acc-sw-lt7"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["acc-sw-lt7"].id, to_device_id: byHost["ap-lt7-01"].id, status: "down" },
      { tenant_id: demo.id, from_device_id: byHost["acc-sw-lt7"].id, to_device_id: byHost["ap-lt7-02"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["edge-rtr-01"].id, to_device_id: byHost["olt-pon-01"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["edge-rtr-01"].id, to_device_id: byHost["br-bsd-rtr"].id, status: "degraded" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-01"].id, to_device_id: byHost["srv-nms-01"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-01"].id, to_device_id: byHost["srv-app-01"].id, status: "up" },
      { tenant_id: demo.id, from_device_id: byHost["core-sw-01"].id, to_device_id: byHost["srv-db-01"].id, status: "up" },
      { tenant_id: acme.id, from_device_id: acmeRows[0].id, to_device_id: acmeRows[1].id, status: "up" },
      { tenant_id: acme.id, from_device_id: acmeRows[1].id, to_device_id: acmeRows[2].id, status: "down" },
    ],
  });

  await prisma.alert.createMany({
    data: [
      {
        tenant_id: demo.id,
        device_id: byHost["ap-lt7-01"].id,
        event: "device_down",
        status: "firing",
        severity: "critical",
        created_at: hoursAgo(4),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["acc-sw-lt3"].id,
        event: "high_latency",
        status: "firing",
        severity: "warning",
        created_at: hoursAgo(2),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["br-bsd-rtr"].id,
        event: "packet_loss",
        status: "firing",
        severity: "warning",
        created_at: hoursAgo(1),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["srv-db-01"].id,
        event: "disk_almost_full",
        status: "resolved",
        severity: "warning",
        created_at: hoursAgo(18),
        resolved_at: hoursAgo(12),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["edge-fw-01"].id,
        event: "interface_flapping",
        status: "resolved",
        severity: "critical",
        created_at: hoursAgo(30),
        resolved_at: hoursAgo(26),
      },
      {
        tenant_id: acme.id,
        device_id: acmeRows[2].id,
        event: "device_down",
        status: "firing",
        severity: "critical",
        created_at: hoursAgo(8),
      },
    ],
  });

  await prisma.ticket_connector.create({
    data: {
      tenant_id: demo.id,
      provider: "netmon",
      name: "NETMON Helpdesk",
      enabled: true,
      direction: "both",
      auto_open: true,
      severities: "critical,warning",
      inbound_token: `nm_${randomBytes(24).toString("hex")}`,
      config: { events: "*" },
      last_status: "local helpdesk ready",
    },
  });

  const jira = await prisma.ticket_connector.create({
    data: {
      tenant_id: demo.id,
      provider: "jira",
      name: "Jira NOC",
      enabled: false,
      direction: "both",
      auto_open: false,
      severities: "critical",
      base_url: "https://jira.example.com",
      api_user: "noc@demo.netmon.click",
      inbound_token: `nm_${randomBytes(24).toString("hex")}`,
      config: { project_key: "NOC", issue_type: "Incident" },
      last_status: "seeded — add API token to enable",
    },
  });

  const downAlert = await prisma.alert.findFirst({
    where: { tenant_id: demo.id, event: "device_down", status: "firing" },
  });
  if (downAlert) {
    const ticket = await prisma.ticket.create({
      data: {
        tenant_id: demo.id,
        connector_id: jira.id,
        alert_id: downAlert.id,
        device_id: downAlert.device_id,
        external_id: "NOC-1042",
        external_url: "https://jira.example.com/browse/NOC-1042",
        title: "CRITICAL device_down · ap-lt7-01",
        body: "Access point down on HQ Lantai-7. Received from Jira webhook.",
        status: "open",
        priority: "critical",
        direction: "inbound",
        last_synced_at: hoursAgo(3),
      },
    });
    await prisma.ticket_comment.create({
      data: {
        tenant_id: demo.id,
        ticket_id: ticket.id,
        author: "jira-bot",
        body: "NOC queue accepted this incident. Waiting for field tech.",
        direction: "inbound",
        created_at: hoursAgo(3),
      },
    });
  }

  await prisma.agent.createMany({
    data: [
      {
        tenant_id: demo.id,
        device_id: byHost["srv-nms-01"].id,
        token: `demo-${randomBytes(12).toString("hex")}`,
        version: "1.2.0",
        status: "online",
        last_seen: hoursAgo(0.05),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["srv-app-01"].id,
        token: `demo-${randomBytes(12).toString("hex")}`,
        version: "1.2.0",
        status: "online",
        last_seen: hoursAgo(0.2),
      },
      {
        tenant_id: demo.id,
        device_id: byHost["cctv-nvr-01"].id,
        token: `demo-${randomBytes(12).toString("hex")}`,
        version: "1.0.4",
        status: "pending",
      },
    ],
  });

  await prisma.dashboard.createMany({
    data: [
      {
        tenant_id: demo.id,
        name: "NOC Overview",
        layout: {
          widgets: [
            { id: "w1", type: "availability" },
            { id: "w2", type: "alerts" },
            { id: "w3", type: "cpu" },
            { id: "w4", type: "topology" },
          ],
        },
      },
      {
        tenant_id: demo.id,
        name: "Branch BSD",
        layout: {
          widgets: [
            { id: "b1", type: "availability" },
            { id: "b2", type: "alerts" },
          ],
        },
      },
      {
        tenant_id: acme.id,
        name: "Acme Fiber NOC",
        layout: { widgets: [{ id: "a1", type: "availability" }, { id: "a2", type: "alerts" }] },
      },
    ],
  });

  await prisma.kb_article.createMany({
    data: [
      {
        tenant_id: demo.id,
        title: "Device down runbook",
        slug: "device-down-runbook",
        category: "runbook",
        tags: "alert, device_down",
        published: true,
        body: [
          "1. Confirm the alert on /dashboard/alerts.",
          "2. Check neighbor status on topology.",
          "3. If the site is isolated, open a NovaCRM or local ticket.",
          "4. After recovery, verify SLA and close the ticket.",
        ].join("\n"),
      },
      {
        tenant_id: demo.id,
        title: "VPN client cannot connect",
        slug: "vpn-client-cannot-connect",
        category: "network",
        tags: "vpn, access",
        published: true,
        body: [
          "Check the concentrator and last-seen on Inventory.",
          "Confirm the user is on the correct profile.",
          "If CPU is high for 15 minutes, scale or reboot the node in the change window.",
        ].join("\n"),
      },
      {
        tenant_id: demo.id,
        title: "Internal: poller notes",
        slug: "internal-poller-notes",
        category: "general",
        tags: "internal",
        published: false,
        body: "Draft. Worker must run for TCP checks. Do not publish until reviewed.",
      },
    ],
  });

  await prisma.cmdb_ci.createMany({
    data: [
      {
        tenant_id: demo.id,
        device_id: byHost["core-sw-01"].id,
        ci_type: "hardware",
        name: "Core Switch A",
        asset_tag: "NM-SW-0001",
        serial: "FOC1234X1",
        owner: "Network Ops",
        status: "in_service",
        location: "DC-A / Rack-01",
      },
      {
        tenant_id: demo.id,
        device_id: byHost["edge-fw-01"].id,
        ci_type: "hardware",
        name: "Edge Firewall",
        asset_tag: "NM-FW-0001",
        serial: "FGT60F-8891",
        owner: "Security",
        status: "in_service",
        location: "DC-A / Edge",
      },
      {
        tenant_id: demo.id,
        device_id: byHost["ap-lt7-01"].id,
        ci_type: "hardware",
        name: "AP Lantai 7-01",
        asset_tag: "NM-AP-071",
        serial: "U7-PRO-441",
        owner: "Facilities",
        status: "outage",
        location: "HQ / Lantai-7",
      },
      {
        tenant_id: demo.id,
        ci_type: "circuit",
        name: "Metro-E BSD 100 Mbps",
        asset_tag: "NM-CIR-BSD",
        owner: "Vendor Telco",
        status: "in_service",
        location: "Branch-BSD",
      },
      {
        tenant_id: demo.id,
        ci_type: "software",
        name: "NETMON Agent 1.2.0",
        asset_tag: "NM-SW-AGENT",
        owner: "Platform",
        status: "in_service",
        location: "DC-A / Compute",
      },
    ],
  });

  const admin = users[0];
  const operator = users[2];
  await prisma.audit_log.createMany({
    data: [
      { tenant_id: demo.id, user_id: admin.id, action: "tenant.seed:demo", created_at: hoursAgo(48) },
      { tenant_id: demo.id, user_id: admin.id, action: "user.create:operator@demo.netmon.click", created_at: hoursAgo(36) },
      { tenant_id: demo.id, user_id: operator.id, action: "device.create:olt-pon-01", created_at: hoursAgo(20) },
      { tenant_id: demo.id, user_id: operator.id, action: "device.import:8", created_at: hoursAgo(12) },
      { tenant_id: demo.id, user_id: admin.id, action: "alert.ack:ap-lt7-01", created_at: hoursAgo(3) },
    ],
  });

  const counts = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    devices: await prisma.device.count(),
    alerts: await prisma.alert.count(),
    metrics: await prisma.metric.count(),
    links: await prisma.device_link.count(),
    agents: await prisma.agent.count(),
    cmdb: await prisma.cmdb_ci.count(),
    channels: await prisma.notify_channel.count(),
    tickets: await prisma.ticket.count(),
  };

  console.log("NETMON dummy data ready:", counts);
  console.log("Login: admin@netmon.click / ChangeMeNow!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
