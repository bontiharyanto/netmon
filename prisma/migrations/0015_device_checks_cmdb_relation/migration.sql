-- AlterTable
ALTER TABLE "device" ADD COLUMN "checks" JSONB NOT NULL DEFAULT '{"tcp":[80]}';

-- CreateTable
CREATE TABLE "cmdb_relation" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_ci_id" TEXT NOT NULL,
    "to_ci_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cmdb_relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cmdb_relation_tenant_id_idx" ON "cmdb_relation"("tenant_id");

-- CreateIndex
CREATE INDEX "cmdb_relation_from_ci_id_idx" ON "cmdb_relation"("from_ci_id");

-- CreateIndex
CREATE INDEX "cmdb_relation_to_ci_id_idx" ON "cmdb_relation"("to_ci_id");

-- CreateIndex
CREATE UNIQUE INDEX "cmdb_relation_tenant_id_from_ci_id_to_ci_id_relation_type_key" ON "cmdb_relation"("tenant_id", "from_ci_id", "to_ci_id", "relation_type");

-- AddForeignKey
ALTER TABLE "cmdb_relation" ADD CONSTRAINT "cmdb_relation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cmdb_relation" ADD CONSTRAINT "cmdb_relation_from_ci_id_fkey" FOREIGN KEY ("from_ci_id") REFERENCES "cmdb_ci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cmdb_relation" ADD CONSTRAINT "cmdb_relation_to_ci_id_fkey" FOREIGN KEY ("to_ci_id") REFERENCES "cmdb_ci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
