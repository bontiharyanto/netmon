-- AlterTable
ALTER TABLE "device" ADD COLUMN "display_name" TEXT,
ADD COLUMN "skip_poller_when_agent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_check_at" TIMESTAMP(3),
ADD COLUMN "last_check_status" TEXT,
ADD COLUMN "last_check_latency_ms" INTEGER,
ADD COLUMN "last_check_detail" JSONB;

-- CreateIndex
CREATE INDEX "device_tenant_id_type_idx" ON "device"("tenant_id", "type");

-- CreateTable
CREATE TABLE "device_check_result" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "detail" JSONB NOT NULL,

    CONSTRAINT "device_check_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_check_result_device_id_ts_idx" ON "device_check_result"("device_id", "ts");

-- CreateIndex
CREATE INDEX "device_check_result_tenant_id_ts_idx" ON "device_check_result"("tenant_id", "ts");

-- AddForeignKey
ALTER TABLE "device_check_result" ADD CONSTRAINT "device_check_result_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_check_result" ADD CONSTRAINT "device_check_result_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "floor_placement" ADD COLUMN "rack" TEXT,
ADD COLUMN "zone" TEXT;
