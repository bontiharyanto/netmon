-- AlterTable
ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "idle_minutes" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "kb_article" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kb_article_tenant_id_slug_key" ON "kb_article"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "kb_article_tenant_id_published_idx" ON "kb_article"("tenant_id", "published");

-- AddForeignKey
ALTER TABLE "kb_article" ADD CONSTRAINT "kb_article_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
