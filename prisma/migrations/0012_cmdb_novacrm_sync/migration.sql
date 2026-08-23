-- AlterTable
ALTER TABLE "cmdb_ci" ADD COLUMN "external_asset_id" TEXT;
ALTER TABLE "cmdb_ci" ADD COLUMN "external_ci_id" TEXT;
ALTER TABLE "cmdb_ci" ADD COLUMN "last_synced_at" TIMESTAMP(3);
ALTER TABLE "cmdb_ci" ADD COLUMN "last_sync_error" TEXT;
