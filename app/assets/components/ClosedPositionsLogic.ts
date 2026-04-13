
import { TradeRecord } from "@prisma/client";
import { ClosedPosition } from "../components/ClosedPositionsTable";
import { differenceInDays } from "date-fns";

// Match the shape returned by actions.ts
type TransactionWithAsset = TradeRecord & {
    assetName: string;
    assetSymbol: string | null;
};

export function calculateClosedPositions(transactions: TransactionWithAsset[]): ClosedPosition[] {
    // 1. Group by Asset
    const assetsMap: Record<string, TransactionWithAsset[]> = {};

    transactions.forEach(t => {
        if (!assetsMap[t.assetId]) {
            assetsMap[t.assetId] = [];
        }
        assetsMap[t.assetId].push(t);
    });

    const closed: ClosedPosition[] = [];

    // 2. Process each asset
    Object.values(assetsMap).forEach(txs => {
        // Sort by date asc
        txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentQty = 0;
        let roundStartTime: Date | null = null;

        // Accumulators for the CURRENT round
        let costBasis = 0;       // Total money spent buying
        let buyQtyTotal = 0;     // Total units bought

        let realization = 0;     // Total money received (Sells + Dividends)
        let sellQtyTotal = 0;    // Total units sold
        let sellRevenue = 0;     // Money received ONLY from sells (for Avg Sell Price)

        for (const tx of txs) {
            const isBuy = tx.type === 'BUY';
            const isSell = tx.type === 'SELL';
            const isIncome = tx.type === 'INTEREST' || tx.type === 'DIVIDEND';

            // 1. Detect Start of Round
            if (Math.abs(currentQty) < 0.0001 && isBuy) {
                // We were empty, now we buy. Start timer.
                roundStartTime = new Date(tx.date);

                // Reset accumulators
                costBasis = 0;
                buyQtyTotal = 0;
                realization = 0;
                sellQtyTotal = 0;
                sellRevenue = 0;
            }

            // 2. Process Transaction
            if (isBuy) {
                currentQty += tx.quantity;
                costBasis += (tx.price * tx.quantity);
                buyQtyTotal += tx.quantity;
            } else if (isSell) {
                currentQty -= tx.quantity;
                const amount = tx.amount || (tx.price * tx.quantity);
                realization += amount;
                sellRevenue += amount;
                sellQtyTotal += tx.quantity;
            } else if (isIncome) {
                const amount = tx.amount || 0;
                realization += amount;
                // Dividends don't change qty
            }

            // 3. Detect End of Round (Clearance)
            // If we are back to 0 (and we actually did some buying this round)
            if (buyQtyTotal > 0 && Math.abs(currentQty) < 0.0001) {
                const clearDate = new Date(tx.date);
                const startDate = roundStartTime || clearDate; // Fallback if data weird

                const totalPnL = realization - costBasis;
                const roi = costBasis > 0 ? totalPnL / costBasis : 0;
                const avgBuy = buyQtyTotal > 0 ? costBasis / buyQtyTotal : 0;
                const avgSell = sellQtyTotal > 0 ? sellRevenue / sellQtyTotal : 0;
                const days = differenceInDays(clearDate, startDate);

                closed.push({
                    id: `${tx.assetSymbol}-${clearDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                    assetName: tx.assetName,
                    assetSymbol: tx.assetSymbol || '',
                    clearDate,
                    startDate,
                    totalPnL,
                    roi,
                    avgBuyPrice: avgBuy,
                    avgSellPrice: avgSell,
                    holdingDays: days
                });

                // Reset for safety (though next Buy will reset)
                // But if we have dividends AFTER clearance (lagging), they might get orphaned or start weird round?
                // For now assume clean sequences.
                currentQty = 0;
            }
        }
    });

    // Sort by clear date desc (most recent first)
    return closed.sort((a, b) => b.clearDate.getTime() - a.clearDate.getTime());
}
