-- CreateTable
CREATE TABLE "building" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "image_mime" TEXT,
    "image_data" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_placement" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "building_tenant_id_idx" ON "building"("tenant_id");

-- CreateIndex
CREATE INDEX "floor_tenant_id_idx" ON "floor"("tenant_id");

-- CreateIndex
CREATE INDEX "floor_building_id_idx" ON "floor"("building_id");

-- CreateIndex
CREATE INDEX "floor_placement_tenant_id_idx" ON "floor_placement"("tenant_id");

-- CreateIndex
CREATE INDEX "floor_placement_device_id_idx" ON "floor_placement"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "floor_placement_floor_id_device_id_key" ON "floor_placement"("floor_id", "device_id");

-- AddForeignKey
ALTER TABLE "building" ADD CONSTRAINT "building_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor" ADD CONSTRAINT "floor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor" ADD CONSTRAINT "floor_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_placement" ADD CONSTRAINT "floor_placement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_placement" ADD CONSTRAINT "floor_placement_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_placement" ADD CONSTRAINT "floor_placement_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
