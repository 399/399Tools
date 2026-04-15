import prisma from '../lib/prisma';

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
