import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./data/charin.db",
    });
    return new PrismaClient({ adapter });
}

/** Prisma Client シングルトン（Next.js Hot Reload対策） */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
