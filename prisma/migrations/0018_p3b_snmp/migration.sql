-- AlterTable
ALTER TABLE "metric" ADD COLUMN "metric_extra" JSONB;

-- AlterTable
ALTER TABLE "device" ADD COLUMN "snmp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "snmp_version" TEXT,
ADD COLUMN "snmp_community" TEXT,
ADD COLUMN "snmp_port" INTEGER NOT NULL DEFAULT 161,
ADD COLUMN "snmp_profile_id" TEXT,
ADD COLUMN "snmp_v3_user" TEXT,
ADD COLUMN "snmp_v3_auth_proto" TEXT,
ADD COLUMN "snmp_v3_auth_key" TEXT,
ADD COLUMN "snmp_v3_priv_proto" TEXT,
ADD COLUMN "snmp_v3_priv_key" TEXT,
ADD COLUMN "snmp_last_error" TEXT,
ADD COLUMN "snmp_last_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "snmp_profile" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "oids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snmp_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snmp_profile_tenant_id_idx" ON "snmp_profile"("tenant_id");

-- CreateIndex
CREATE INDEX "device_snmp_profile_id_idx" ON "device"("snmp_profile_id");

-- AddForeignKey
ALTER TABLE "snmp_profile" ADD CONSTRAINT "snmp_profile_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_snmp_profile_id_fkey" FOREIGN KEY ("snmp_profile_id") REFERENCES "snmp_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- System profiles (tenant_id NULL)
INSERT INTO "snmp_profile" ("id", "tenant_id", "name", "oids", "created_at") VALUES
(
  'sys_snmp_host_cpu',
  NULL,
  'Host CPU (HR-MIB)',
  '[{"key":"cpu","oid":"1.3.6.1.2.1.25.3.3.1.2.1","metric":"cpu_percent","scale":1}]'::jsonb,
  CURRENT_TIMESTAMP
),
(
  'sys_snmp_if_mib',
  NULL,
  'IF-MIB basics (ifIndex 1)',
  '[
    {"key":"ifInOctets","oid":"1.3.6.1.2.1.2.2.1.10.1","metric":"custom","scale":1},
    {"key":"ifOutOctets","oid":"1.3.6.1.2.1.2.2.1.16.1","metric":"custom","scale":1},
    {"key":"ifOperStatus","oid":"1.3.6.1.2.1.2.2.1.8.1","metric":"custom","scale":1}
  ]'::jsonb,
  CURRENT_TIMESTAMP
);
