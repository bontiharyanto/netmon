-- CreateTable
CREATE TABLE "ticket_connector" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL DEFAULT 'both',
    "auto_open" BOOLEAN NOT NULL DEFAULT false,
    "severities" TEXT NOT NULL DEFAULT 'critical',
    "base_url" TEXT NOT NULL DEFAULT '',
    "api_user" TEXT NOT NULL DEFAULT '',
    "api_key" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "inbound_token" TEXT NOT NULL,
    "last_tested_at" TIMESTAMP(3),
    "last_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "alert_id" TEXT,
    "device_id" TEXT,
    "external_id" TEXT NOT NULL DEFAULT '',
    "external_url" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'high',
    "direction" TEXT NOT NULL,
    "last_error" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_connector_inbound_token_key" ON "ticket_connector"("inbound_token");

-- CreateIndex
CREATE INDEX "ticket_connector_tenant_id_idx" ON "ticket_connector"("tenant_id");

-- CreateIndex
CREATE INDEX "ticket_tenant_id_idx" ON "ticket"("tenant_id");

-- CreateIndex
CREATE INDEX "ticket_alert_id_idx" ON "ticket"("alert_id");

-- CreateIndex
CREATE INDEX "ticket_connector_id_external_id_idx" ON "ticket"("connector_id", "external_id");

-- CreateIndex
CREATE INDEX "ticket_comment_ticket_id_idx" ON "ticket_comment"("ticket_id");

-- AddForeignKey
ALTER TABLE "ticket_connector" ADD CONSTRAINT "ticket_connector_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "ticket_connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comment" ADD CONSTRAINT "ticket_comment_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
