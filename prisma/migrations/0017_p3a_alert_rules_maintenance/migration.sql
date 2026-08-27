-- AlterTable
ALTER TABLE "alert" ADD COLUMN "message" TEXT,
ADD COLUMN "rule_id" TEXT;

-- CreateTable
CREATE TABLE "alert_rule" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "event" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "device_id" TEXT,
    "device_type" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "for_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rule_state" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rule_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_window" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "scope_config" JSONB NOT NULL DEFAULT '{}',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "suppress_alert" BOOLEAN NOT NULL DEFAULT true,
    "suppress_notify" BOOLEAN NOT NULL DEFAULT true,
    "suppress_ticket" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_window_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rule_tenant_id_enabled_idx" ON "alert_rule"("tenant_id", "enabled");

-- CreateIndex
CREATE INDEX "alert_rule_tenant_id_event_idx" ON "alert_rule"("tenant_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rule_state_rule_id_device_id_key" ON "alert_rule_state"("rule_id", "device_id");

-- CreateIndex
CREATE INDEX "alert_rule_state_tenant_id_idx" ON "alert_rule_state"("tenant_id");

-- CreateIndex
CREATE INDEX "maintenance_window_tenant_id_starts_at_ends_at_idx" ON "maintenance_window"("tenant_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "alert_rule_id_idx" ON "alert"("rule_id");

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule_state" ADD CONSTRAINT "alert_rule_state_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_window" ADD CONSTRAINT "maintenance_window_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill default device_down rules for existing tenants
INSERT INTO "alert_rule" ("id", "tenant_id", "name", "enabled", "event", "severity", "config", "for_seconds", "created_at", "updated_at")
SELECT
  md5(random()::text || clock_timestamp()::text || t.id),
  t.id,
  'Device down',
  true,
  'device_down',
  'critical',
  '{}',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "alert_rule" r WHERE r.tenant_id = t.id AND r.event = 'device_down'
);
