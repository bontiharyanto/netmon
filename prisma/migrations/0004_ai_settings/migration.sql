-- CreateTable
CREATE TABLE "ai_setting" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" TEXT NOT NULL DEFAULT 'local',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "base_url" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "api_key" TEXT,
    "copilot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "insights_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_status" TEXT,

    CONSTRAINT "ai_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_setting_tenant_id_key" ON "ai_setting"("tenant_id");

-- AddForeignKey
ALTER TABLE "ai_setting" ADD CONSTRAINT "ai_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
