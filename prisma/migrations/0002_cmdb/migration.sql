-- CreateTable
CREATE TABLE "cmdb_ci" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "device_id" TEXT,
    "ci_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_tag" TEXT,
    "serial" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_service',
    "location" TEXT,

    CONSTRAINT "cmdb_ci_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cmdb_ci_tenant_id_idx" ON "cmdb_ci"("tenant_id");

-- AddForeignKey
ALTER TABLE "cmdb_ci" ADD CONSTRAINT "cmdb_ci_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cmdb_ci" ADD CONSTRAINT "cmdb_ci_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
