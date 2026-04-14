import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subMonths, startOfYear, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Wallet, Activity, Coins, LineChart } from "lucide-react";
import { calculateXIRR } from "@/lib/finance";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
}

type DateRange = '1M' | '3M' | 'YTD' | 'ALL';

export default function RegularDashboard({ transactions }: RegularDashboardProps) {
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined }>({
        from: undefined,
        to: undefined,
    });
    const [activePreset, setActivePreset] = useState<DateRange | 'CUSTOM'>('ALL');
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
    }, []);

    const handlePresetChange = (preset: DateRange) => {
        setActivePreset(preset);
        const now = new Date();
        const startOfToday = startOfDay(now);
        const endOfToday = endOfDay(now);

        switch (preset) {
            case '1M':
                setDateRange({ from: subMonths(startOfToday, 1), to: endOfToday });
                break;
            case '3M':
                setDateRange({ from: subMonths(startOfToday, 3), to: endOfToday });
                break;
            case 'YTD':
                setDateRange({ from: startOfYear(startOfToday), to: endOfToday });
                break;
            case 'ALL':
            default:
                setDateRange({ from: undefined, to: undefined });
                break;
        }
    };

    const metrics = useMemo(() => {
        // Sort transactions by date ascending
        const sorted = [...transactions].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let totalCashIn = 0;
        let totalCashOut = 0;

        // Asset holding tracking
        const assets: Record<string, { quantity: number; currentPrice: number }> = {};

        // Cash flows for XIRR: { date, amount }
        // Inflows (Deposits/Buys) are negative for user wallet perspective? 
        // Standard XIRR: 
        // - Inflows (investments) are NEGATIVE.
        // - Outflows (returns) are POSITIVE.
        // - Terminal Value is POSITIVE.
        const cashFlows: { date: Date; amount: number }[] = [];

        // PnL Data for chart (cumulative profit over time)
        // This is tricky. "Cumulative Profit" = Current Value - Net Investment.
        // We need to track this day by day? Or just trade by trade?
        // Let's do trade by trade points.
        const pnlData: { date: string; value: number; rawDate: Date }[] = [];

        sorted.forEach((tx) => {
            const sym = tx.assetSymbol || tx.assetName || "UNKNOWN";
            if (!assets[sym]) assets[sym] = { quantity: 0, currentPrice: 0 };

            // Update latest price from this transaction (approximate for history)
            // Ideally we have historical prices, but here we only have trade prices.
            // For current Dashboard snapshot, we use `tx.currentPrice` (latest).
            // For historical curve, this might be inaccurate, but "Real-time market value" implies current.
            // But "Cumulative Profit" history?
            // "Cumulative Profit" = (Current Assets Value at T) - (Net Invested at T)
            // Without historical price data, we can't calculate accurate Historical Asset Value.
            // We can only calculate Realized PnL + Unrealized based on "last known price".
            // Let's use the transaction price as the "market price" at that moment.

            assets[sym].currentPrice = tx.price;

            if (tx.type === "BUY") {
                assets[sym].quantity += tx.quantity;
                totalCashIn += tx.amount;
                // Investment: Negative cash flow
                cashFlows.push({ date: new Date(tx.date), amount: -tx.amount });
            } else if (tx.type === "SELL") {
                assets[sym].quantity -= tx.quantity;
                totalCashOut += tx.amount;
                // Return: Positive cash flow
                cashFlows.push({ date: new Date(tx.date), amount: tx.amount });
            } else if (tx.type === "DIVIDEND" || tx.type === "INTEREST") {
                // Income: Positive cash flow, but NO change in quantity.
                // Treats as a "Return" of capital or Profit. 
                // Increases CashBalance => Decreases NetInvested (In - Out).
                // MWRR Flow: Positive
                totalCashOut += tx.amount;
                cashFlows.push({ date: new Date(tx.date), amount: tx.amount });
            }

            // Handle dust
            if (Math.abs(assets[sym].quantity) < 0.000001) {
                assets[sym].quantity = 0;
            }

            // Calculate Metrics at this point (Snapshot)
            let snapshotAssetValue = 0;
            Object.values(assets).forEach(a => {
                snapshotAssetValue += a.quantity * a.currentPrice;
            });

            const snapshotNetInvested = totalCashIn - totalCashOut;
            // Cumulative Profit = Asset Value - Net Invested
            // Note: If we sold everything, Asset Value is 0. Profit = 0 - (CashIn - CashOut) = CashOut - CashIn (Realized). Correct.
            const currentCumProfit = snapshotAssetValue - snapshotNetInvested;

            const txDate = new Date(tx.date);
            const dateStr = format(txDate, "yyyy-MM-dd");
            const lastPoint = pnlData[pnlData.length - 1];

            if (lastPoint && lastPoint.date === dateStr) {
                lastPoint.value = currentCumProfit;
            } else {
                pnlData.push({ date: dateStr, value: currentCumProfit, rawDate: txDate });
            }
        });

        // Final Calculation for Cards
        let currentTotalAssets = 0;
        let holdingsCount = 0;

        // Use the LATEST CURRENT PRICE from the asset record (passed via props), not just last trade price
        // The prop `transactions` has `currentPrice` on every tx, which comes from `asset.currentPrice`.
        // So for the current snapshot, we should use that if available.
        // We need a map of Asset -> LatestPrice.
        // Iterate transactions to find unique assets and their latest `currentPrice` property.
        // Or better, `assets` map tracks quantity. We just need to update prices to `asset.currentPrice` from DB.

        // We can re-scan transactions to build a map of Symbol -> Latest DB Price
        const latestPrices: Record<string, number> = {};
        transactions.forEach(tx => {
            const sym = tx.assetSymbol || tx.assetName || "UNKNOWN";
            if (tx.currentPrice) {
                latestPrices[sym] = tx.currentPrice;
            }
        });

        // Recalculate Total Assets with best available price
        Object.keys(assets).forEach(sym => {
            const quantity = assets[sym].quantity;
            if (quantity > 0) {
                holdingsCount++;
                const price = latestPrices[sym] || assets[sym].currentPrice; // Prefer DB current price
                currentTotalAssets += quantity * price;
            }
        });

        const netInvested = totalCashIn - totalCashOut;
        const cumulativeProfit = currentTotalAssets - netInvested;

        // Hydration safety: use `now` if available (client), else empty/defaults (server/initial)
        if (!now) {
            return {
                totalAssets: 0,
                cumulativeProfit: 0,
                mwrr: 0,
                annualizedReturn: 0,
                holdingsCount: 0,
                pnlData: [],
                netInvested: 0
            };
        }

        const tNow = now;

        // MWRR (Money Weighted Rate of Return)
        // Add Terminal Value as a positive cash flow at NOW
        const mwrrMethodFlows = [...cashFlows, { date: tNow, amount: currentTotalAssets }];
        const mwrr = calculateXIRR(mwrrMethodFlows);

        // Annualized Return logic...
        const firstDate = sorted.length > 0 ? new Date(sorted[0].date) : tNow;
        const daysSinceStart = differenceInDays(tNow, firstDate);

        // Simple ROI
        const roi = totalCashIn > 0 ? (cumulativeProfit / totalCashIn) : 0;

        // Annualized ROI (Compound)
        const annualizedReturn = daysSinceStart > 0 ? (Math.pow(1 + roi, 365 / daysSinceStart) - 1) : 0;

        return {
            totalAssets: currentTotalAssets,
            cumulativeProfit,
            mwrr,
            annualizedReturn,
            holdingsCount,
            pnlData,
            netInvested
        };
    }, [transactions, now]);

    const formatPercent = (val: number) => {
        if (!isFinite(val) || isNaN(val)) return "0.00%";
        if (val > 1000) return ">1000%";
        if (val < -1000) return "<-1000%";
        return (val * 100).toFixed(2) + "%";
    };


    const chartData = useMemo(() => {
        if (!dateRange.from) return metrics.pnlData;

        const filtered = metrics.pnlData.filter(d =>
            // We use start of day comparison for consistency
            d.rawDate >= dateRange.from! &&
            (dateRange.to ? d.rawDate <= dateRange.to : true)
        );
        return filtered;
    }, [metrics.pnlData, dateRange]);

    const pnlColor = metrics.cumulativeProfit >= 0 ? "#10b981" : "#ef4444";

    return (
        <div className="space-y-4 mb-6">
            {/* Top Row: Metrics Cards */}
            {/* Top Row: Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总资产（元）</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalAssets.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total Assets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">累计收益（元）</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.cumulativeProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {metrics.cumulativeProfit > 0 ? "+" : ""}{metrics.cumulativeProfit.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">资产 - 净投入</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">资金加权收益率</CardTitle>
                        <LineChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.mwrr >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPercent(metrics.mwrr)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">MWRR (IRR)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">年化收益率</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.annualizedReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPercent(metrics.annualizedReturn)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">复利年化CAGR</p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: PnL Curve */}
            <Card className="col-span-4">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">累计收益走势</CardTitle>
                        <LineChart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                            {(['1M', '3M', 'YTD', 'ALL'] as const).map((preset) => (
                                <Button
                                    key={preset}
                                    variant={activePreset === preset ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn(
                                        "h-7 text-xs px-3 transition-all",
                                        activePreset === preset && "bg-white dark:bg-zinc-700 shadow-sm font-medium"
                                    )}
                                    onClick={() => handlePresetChange(preset)}
                                >
                                    {preset === '1M' && "近1月"}
                                    {preset === '3M' && "近3月"}
                                    {preset === 'YTD' && "本年"}
                                    {preset === 'ALL' && "全部"}
                                </Button>
                            ))}
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 w-[240px] justify-start text-left font-normal",
                                        !dateRange.from && "text-muted-foreground",
                                        activePreset === 'CUSTOM' && "border-primary ring-1 ring-primary"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "yyyy-MM-dd")} -{" "}
                                                {format(dateRange.to, "yyyy-MM-dd")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "yyyy-MM-dd")
                                        )
                                    ) : (
                                        <span>自定义时间范围</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange.from}
                                    selected={dateRange}
                                    onSelect={(range) => {
                                        setActivePreset('CUSTOM');
                                        setDateRange(range ?? { from: undefined, to: undefined });
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={pnlColor} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={pnlColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(new Date(str), 'MM-dd')}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    hide
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                    labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
                                    formatter={(val: number | undefined) => [val?.toFixed(2) ?? "0.00", "累计盈亏"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={pnlColor}
                                    fillOpacity={1}
                                    fill="url(#colorPnL)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
