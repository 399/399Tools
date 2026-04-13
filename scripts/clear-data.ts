// Copy of lib/prisma.ts initialization logic
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3' // Wait, lib/prisma.ts didn't import Database?
// Ah, lib/prisma.ts uses `new PrismaBetterSqlite3({ url: ... })` which seems to be a wrapper?
// Or maybe I misread lib/prisma.ts.
// Let's re-read lib/prisma.ts carefully.
// It imports `PrismaBetterSqlite3` from `@prisma/adapter-better-sqlite3`.
// And `new PrismaBetterSqlite3({ url: ... })`.
import path from 'path';

const prismaClientSingleton = () => {
    // Assuming run from root
    const dbPath = path.join(process.cwd(), 'dev.db');
    // Usually connection string is file: path
    const connectionString = `file:${dbPath}`;
    console.log(`Using DB: ${connectionString}`);

    // Note: If you face "better-sqlite3" import issues, ensuring standard instantiation might be safer if not strictly needed.
    // But schema requires it.
    const adapter = new PrismaBetterSqlite3({ url: connectionString })
    return new PrismaClient({ adapter })
}

const prisma = prismaClientSingleton()


async function main() {
    const name = "可转债轮动";
    console.log(`Looking for portfolio: ${name}`);

    const portfolio = await prisma.portfolio.findFirst({
        where: { name: name }
    });

    if (!portfolio) {
        console.error(`Portfolio "${name}" not found.`);
        return;
    }

    console.log(`Found portfolio ID: ${portfolio.id}`);

    // Delete assets. TradeRecords should cascade delete.
    const deletedAssets = await prisma.asset.deleteMany({
        where: {
            portfolioId: portfolio.id
        }
    });

    console.log(`Deleted ${deletedAssets.count} assets (and their trade records).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
