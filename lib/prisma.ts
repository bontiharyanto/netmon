import { PrismaClient } from "@prisma/client";

const PRISMA_GEN = "indexes-help-v1";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaGen?: string };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaGen === PRISMA_GEN
    ? globalForPrisma.prisma
    : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaGen = PRISMA_GEN;
}
