'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPortfolio(data: {
    name: string;
    description?: string;
    strategyMode: 'GRID' | 'REGULAR';
}) {
    const portfolio = await prisma.portfolio.create({
        data,
    });
    revalidatePath('/assets');
    return portfolio;
}

export async function getPortfolios() {
    return await prisma.portfolio.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { assets: true },
            },
        },
    });
}

export async function getPortfolio(id: string) {
    return await prisma.portfolio.findUnique({
        where: { id },
        include: {
            assets: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });
}

export async function deletePortfolio(id: string) {
    await prisma.portfolio.delete({
        where: { id },
    });
    revalidatePath('/assets');
}

export async function updatePortfolio(id: string, data: { name: string; description?: string }) {
    const portfolio = await prisma.portfolio.update({
        where: { id },
        data,
    });
    revalidatePath('/assets');
    revalidatePath(`/assets/portfolio/${id}`);
    return portfolio;
}

export async function createAsset(data: {
    name: string;
    symbol?: string;
    note?: string;
    portfolioId: string;
    pressurePrice?: number;
    supportPrice?: number;
    gridStep?: number;
    gridAmount?: number;
}) {
    const asset = await prisma.asset.create({
        data,
    });
    revalidatePath(`/assets/portfolio/${data.portfolioId}`);
    return asset;
}

export async function deleteAsset(id: string, portfolioId: string) {
    await prisma.asset.delete({
        where: { id },
    });
    revalidatePath(`/assets/portfolio/${portfolioId}`);
}

export async function createTransaction(data: {
    portfolioId: string;
    symbol: string;
    name?: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | string;
    price: number;
    quantity: number;
    amount?: number;
    date: Date;
}) {
    // 1. Find or create the Asset
    let asset = await prisma.asset.findFirst({
        where: {
            portfolioId: data.portfolioId,
            symbol: data.symbol
        }
    });

    if (!asset) {
        asset = await prisma.asset.create({
            data: {
                portfolioId: data.portfolioId,
                name: data.name || data.symbol, // Fallback to symbol if name not provided
                symbol: data.symbol,
            }
        });
    }

    // 2. Create the Transaction (TradeRecord)
    const quantity = Math.round(data.quantity); // Enforce integer
    const transaction = await prisma.tradeRecord.create({
        data: {
            assetId: asset.id,
            type: data.type,
            price: data.price,
            quantity: quantity,
            amount: data.amount !== undefined ? data.amount : (data.price * quantity),
            date: data.date
        }
    });

    // 3. Update Asset currentPrice
    await prisma.asset.update({
        where: { id: asset.id },
        data: { currentPrice: data.price }
    });

    revalidatePath(`/assets/portfolio/${data.portfolioId}`);
    return transaction;
}

export async function deleteTransaction(transactionId: string, portfolioId: string) {
    await prisma.tradeRecord.delete({
        where: { id: transactionId }
    });
    revalidatePath(`/assets/portfolio/${portfolioId}`);
}

export async function getPortfolioTransactions(portfolioId: string) {
    // Get all assets for the portfolio, include their transactions
    const assets = await prisma.asset.findMany({
        where: { portfolioId },
        include: {
            transactions: {
                orderBy: { date: 'desc' }
            }
        }
    });

    // Flatten to a list of transactions with asset info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = assets.flatMap((asset: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        asset.transactions.map((tx: any) => ({
            ...tx,
            assetName: asset.name,
            assetSymbol: asset.symbol,
            currentPrice: asset.currentPrice
        }))
    );

    // Sort by date desc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transactions.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
}

export async function importTransactions(portfolioId: string, csvData: string) {
    const lines = csvData.trim().split('\n');
    let successCount = 0;
    let failCount = 0;

    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines silently

        try {
            // Expected format: Date, Code, Name, Type, Price, Quantity, Amount (optional)
            const parts = line.split(',').map(s => s.trim());
            if (parts.length < 6) {
                errors.push(`Row ${i + 1}: Columns < 6. Content: ${line}`);
                failCount++;
                continue;
            }

            const [dateStr, symbol, name, typeStr, priceStr, qtyStr, amountStr] = parts;

            // Map typeStr to allowed types
            let type = 'BUY';
            const upperType = typeStr.toUpperCase();

            // Relaxed matching for SELL types
            if (upperType.includes('SELL') || upperType.includes('卖') || upperType.includes('SHORT')) {
                type = 'SELL';
            }
            else if (upperType.includes('派息') || upperType.includes('INTEREST') || upperType.includes('利息')) {
                type = 'INTEREST';
            }
            else if (upperType.includes('红利') || upperType.includes('DIVIDEND') || upperType.includes('分红')) {
                type = 'DIVIDEND';
            }
            else {
                type = 'BUY'; // Default
            }

            const price = parseFloat(priceStr); // Don't default to 0 yet, check IsNaN
            const quantity = parseFloat(qtyStr);

            let parsedDateStr = dateStr;
            // Handle YYYYMMDD format (e.g. 20220112)
            if (/^\d{8}$/.test(dateStr)) {
                parsedDateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            }
            const date = new Date(parsedDateStr);
            const importedAmount = parseFloat(amountStr) || 0;

            const isIncome = type === 'INTEREST' || type === 'DIVIDEND';

            if (isNaN(date.getTime())) {
                errors.push(`Row ${i + 1}: Invalid Date (${dateStr})`);
                failCount++;
                continue;
            }

            // For Income type, Price/Qty CAN be 0/NaN if amount is provided.
            // For Trade type, Price/Qty must be numbers.
            if (!isIncome) {
                if (isNaN(price) || isNaN(quantity)) {
                    errors.push(`Row ${i + 1}: Invalid Price/Qty for Trade (${priceStr}, ${qtyStr})`);
                    failCount++;
                    continue;
                }
            } else {
                // Income
                // Accept if we have a valid Amount OR (Price and Qty)
                // If amount is valid, we don't care about price/qty being NaN (treat as 0)
                // logic below:
            }

            const safePrice = isNaN(price) ? 0 : price;
            const safeQty = isNaN(quantity) ? 0 : quantity;

            // Logic: Calculate amount. 
            // If Income type: use imported Amount preferably. fallback to price*qty (which might be 0).
            // User request: "Only when type is Interest, use imported Amount".
            const finalAmount = isIncome ? (importedAmount !== 0 ? importedAmount : safePrice) : (safePrice * safeQty);

            // Find or create asset
            let asset = await prisma.asset.findFirst({
                where: {
                    portfolioId,
                    symbol: symbol
                }
            });

            if (!asset) {
                asset = await prisma.asset.create({
                    data: {
                        portfolioId,
                        name: name || symbol,
                        symbol,
                    }
                });
            }

            // Create Transaction
            await prisma.tradeRecord.create({
                data: {
                    assetId: asset.id,
                    type,
                    price: safePrice,
                    quantity: safeQty,
                    amount: finalAmount,
                    date
                }
            });

            successCount++;

        } catch (e: unknown) {
            console.error('Import error for line:', line, e);
            errors.push(`Row ${i + 1}: Server Error - ${e instanceof Error ? e.message : String(e)}`);
            failCount++;
        }
    }

    revalidatePath(`/assets/portfolio/${portfolioId}`);
    // Return errors (capped at top 10 to avoid huge payload)
    return { successCount, failCount, errors: errors.slice(0, 10) };
}

export async function getPortfolioAssets(portfolioId: string) {
    return await prisma.asset.findMany({
        where: { portfolioId },
        select: {
            id: true,
            symbol: true,
            name: true
        }
    });
}
export async function getAllUniqueAssets() {
    const assets = await prisma.asset.findMany({
        select: {
            symbol: true,
            name: true
        },
        distinct: ['symbol', 'name'] // Attempt to get unique pairings
    });

    // Further dedup by symbol if needed, or return all pairs. 
    // User wants to reuse existing info.
    // Let's standardise: unique by symbol is probably best if symbol implies name.
    // But name might vary. Let's return unique symbol/name combos.
    return assets.filter(a => a.symbol); // Filter out empty symbols if any (though usually required for regular trade context, schema allows null)
}
