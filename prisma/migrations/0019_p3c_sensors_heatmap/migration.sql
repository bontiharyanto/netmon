-- AlterTable
ALTER TABLE "device" ADD COLUMN "sensor_kind" TEXT,
ADD COLUMN "sensor_json_path" TEXT,
ADD COLUMN "last_sensor_value" DOUBLE PRECISION,
ADD COLUMN "last_sensor_unit" TEXT;
