// src/config/prismaClient.js
import { PrismaClient } from '@prisma/client';

// In development, hot-reloading can create multiple PrismaClient instances.
// This code prevents that from exhausting database connections.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'warn', 'error'], // Log SQL queries in console for learning!
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
