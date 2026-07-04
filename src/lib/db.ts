import { PrismaClient } from "@prisma/client";

export const dbEnabled = !!process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null = dbEnabled
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : null;

if (prisma && process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
