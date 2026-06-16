/**
 * Prisma client singleton.
 *
 * Imported by every server-side module that needs DB access. The
 * singleton pattern survives Next.js hot-reload in dev: the client is
 * cached on `globalThis` so each HMR cycle reuses the same connection
 * pool instead of leaking it. In production, the cache is a no-op
 * because the process is long-lived.
 *
 * Edge runtime note: this module pulls in `@prisma/client`, which is
 * Node-only. Never import it from `middleware.ts` (which runs on
 * Edge) or any component that's reachable from an Edge route.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const logLevels: Array<'warn' | 'error'> =
  process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
