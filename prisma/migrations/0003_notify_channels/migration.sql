-- CreateTable
CREATE TABLE "notify_channel" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "severities" TEXT NOT NULL DEFAULT 'critical,warning',
    "last_tested_at" TIMESTAMP(3),
    "last_status" TEXT,

    CONSTRAINT "notify_channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notify_channel_tenant_id_idx" ON "notify_channel"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notify_channel_tenant_id_type_key" ON "notify_channel"("tenant_id", "type");

-- AddForeignKey
ALTER TABLE "notify_channel" ADD CONSTRAINT "notify_channel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
