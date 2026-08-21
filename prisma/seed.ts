import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!", 10);

  const demo = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Tenant",
      slug: "demo",
      domain: "demo.netmon.click",
      management_email: "ops@demo.netmon.click",
      brand_color: "#00E5C3",
      plan: "cloud_pro",
      status: "active",
      device_limit: 100,
    },
  });

  await prisma.subscription.upsert({
    where: { tenant_id: demo.id },
    update: { status: "active" },
    create: { tenant_id: demo.id, status: "active" },
  });

  await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@netmon.click" },
    update: {},
    create: {
      tenant_id: demo.id,
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@netmon.click",
      name: "NETMON Superadmin",
      role: "superadmin",
      password_hash: password,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@demo.netmon.click" },
    update: {},
    create: {
      tenant_id: demo.id,
      email: "viewer@demo.netmon.click",
      name: "Demo Viewer",
      role: "viewer",
      password_hash: password,
    },
  });

  const devices = [
    { hostname: "core-sw-01", ip: "10.10.1.1", type: "switch", status: "up", vendor: "Cisco", location: "DC-A" },
    { hostname: "edge-fw-01", ip: "10.10.1.2", type: "firewall", status: "up", vendor: "Fortinet", location: "DC-A" },
    { hostname: "acc-sw-02", ip: "10.10.2.10", type: "switch", status: "degraded", vendor: "MikroTik", location: "Branch-1" },
    { hostname: "srv-nms-01", ip: "10.10.3.5", type: "server", status: "up", vendor: "Dell", location: "DC-A" },
    { hostname: "ap-lt7-01", ip: "10.10.4.21", type: "access-point", status: "down", vendor: "Ubiquiti", location: "Lantai-7" },
  ];

  const created = [];
  for (const item of devices) {
    const row = await prisma.device.upsert({
      where: { ip: item.ip },
      update: item,
      create: { ...item, tenant_id: demo.id },
    });
    created.push(row);
    await prisma.sla.upsert({
      where: { device_id: row.id },
      update: {},
      create: { device_id: row.id, uptime_30d: item.status === "down" ? 97.4 : 99.95 },
    });
    await prisma.metric.create({
      data: {
        device_id: row.id,
        cpu_percent: item.status === "down" ? 0 : 24,
        ram_percent: item.status === "down" ? 0 : 51,
        disk_percent: item.status === "down" ? 0 : 63,
      },
    });
  }

  if (created[0] && created[1]) {
    await prisma.device_link.createMany({
      data: [
        { tenant_id: demo.id, from_device_id: created[0].id, to_device_id: created[1].id, status: "up" },
        { tenant_id: demo.id, from_device_id: created[1].id, to_device_id: created[3].id, status: "up" },
        { tenant_id: demo.id, from_device_id: created[0].id, to_device_id: created[2].id, status: "degraded" },
        { tenant_id: demo.id, from_device_id: created[2].id, to_device_id: created[4].id, status: "down" },
      ],
      skipDuplicates: true,
    });
  }

  const down = created.find((d) => d.status === "down");
  if (down) {
    await prisma.alert.create({
      data: {
        tenant_id: demo.id,
        device_id: down.id,
        event: "device_down",
        status: "firing",
        severity: "critical",
      },
    });
  }

  await prisma.dashboard.create({
    data: {
      tenant_id: demo.id,
      name: "NOC Overview",
      layout: {
        widgets: [
          { id: "w1", type: "availability", x: 0, y: 0, w: 4, h: 2 },
          { id: "w2", type: "alerts", x: 4, y: 0, w: 4, h: 2 },
          { id: "w3", type: "cpu", x: 0, y: 2, w: 8, h: 3 },
        ],
      },
    },
  });

  console.log("NETMON seed complete: demo tenant + admin@netmon.click");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
