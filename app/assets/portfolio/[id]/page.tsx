export const runtime = 'edge';
import { getPortfolio, getPortfolioTransactions, getAllUniqueAssets } from '../../lib/actions';
import AssetForm from '../../components/AssetForm';
import RegularPortfolioView from '../../components/RegularPortfolioView';
import EditPortfolioDialog from '../../components/EditPortfolioDialog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, Grid3X3, List } from 'lucide-react';

export default async function PortfolioDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const portfolio = await getPortfolio(id);

    if (!portfolio) {
        notFound();
    }

    // Fetch transactions if in REGULAR mode
    const transactions = portfolio.strategyMode === 'REGULAR'
        ? await getPortfolioTransactions(portfolio.id)
        : [];

    // Fetch global unique assets for fuzzy search
    // We fetch this regardless of mode if we want to support it, 
    // but strictly it's only needed for Regular mode's TransactionForm for now.
    // Optimisation: only fetch if REGULAR.
    const globalAssets = portfolio.strategyMode === 'REGULAR'
        ? await getAllUniqueAssets()
        : [];

    if (!portfolio) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="space-y-4">
                    <Link
                        href="/assets"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        返回列表
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                    {portfolio.name}
                                </h1>
                                <Badge variant="outline" className="bg-white/50 backdrop-blur-sm">
                                    {portfolio.strategyMode === 'GRID' ? (
                                        <span className="flex items-center gap-1 text-blue-600">
                                            <Grid3X3 size={14} /> 网格模式
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-green-600">
                                            <List size={14} /> 常规模式
                                        </span>
                                    )}
                                </Badge>
                                <EditPortfolioDialog portfolio={portfolio} />
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {portfolio.description || "暂无描述"}
                            </p>
                        </div>
                        {portfolio.strategyMode === 'GRID' && (
                            <AssetForm portfolioId={portfolio.id} strategyMode={portfolio.strategyMode} />
                        )}
                    </div>
                </header>

                <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    {portfolio.strategyMode === 'REGULAR' ? (
                        // REGULAR MODE: Show Transaction Ledger
                        <RegularPortfolioView
                            portfolioId={portfolio.id}
                            transactions={transactions}
                            uniqueAssets={globalAssets}
                        />
                    ) : (
                        // GRID MODE: Show Asset Table
                        <Table>
                            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/50">
                                <TableRow>
                                    <TableHead>品种名称</TableHead>
                                    <TableHead>代码</TableHead>
                                    {portfolio.strategyMode === 'GRID' && (
                                        <>
                                            <TableHead>支撑/压力位</TableHead>
                                            <TableHead>步长/资金</TableHead>
                                        </>
                                    )}
                                    <TableHead>备注</TableHead>
                                    <TableHead className="text-right">时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portfolio.assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={portfolio.strategyMode === 'GRID' ? 5 : 4}
                                            className="h-32 text-center text-zinc-400"
                                        >
                                            暂无品种记录，点击上方按钮添加。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    portfolio.assets.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">{asset.name}</TableCell>
                                            <TableCell className="font-mono text-zinc-500">{asset.symbol || '-'}</TableCell>
                                            {portfolio.strategyMode === 'GRID' && (
                                                <>
                                                    <TableCell>
                                                        <div className="text-xs space-y-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-zinc-400">压:</span>
                                                                <span>{asset.pressurePrice}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-zinc-400">支:</span>
                                                                <span>{asset.supportPrice}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs space-y-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-zinc-400">步:</span>
                                                                <span>{asset.gridStep}%</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-zinc-400">金:</span>
                                                                <span>{asset.gridAmount}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell className="max-w-[200px] truncate group relative">
                                                <span className="text-zinc-600 dark:text-zinc-400">
                                                    {asset.note || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-zinc-400">
                                                {new Date(asset.createdAt).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </section>
            </div>
        </main>
    );
}
