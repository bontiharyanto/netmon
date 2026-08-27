-- CreateTable
CREATE TABLE "role_capability" (
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_capability_pkey" PRIMARY KEY ("role","permission")
);

-- CreateIndex
CREATE INDEX "role_capability_role_idx" ON "role_capability"("role");
