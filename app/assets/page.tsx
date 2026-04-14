import { getPortfolios } from './lib/actions';
import PortfolioForm from './components/PortfolioForm';
import EditPortfolioDialog from './components/EditPortfolioDialog';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

import { Briefcase, ChevronRight, Grid3X3, List } from 'lucide-react';

export default async function AssetsPage() {
    const portfolios = await getPortfolios();

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            投资组合 <span className="text-zinc-400">Portfolios</span>
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            管理您的投资策略与标的列表。
                        </p>
                    </div>
                    <PortfolioForm />
                </header>

                {portfolios.length === 0 ? (
                    <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[400px] flex flex-col items-center justify-center space-y-4 p-12 text-center">
                        <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                            <Briefcase size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">暂无投资组合</h3>
                            <p className="text-zinc-500 max-w-sm">
                                您还没有创建任何投资组合。点击右上角的“新建组合”按钮开始您的第一步尝试。
                            </p>
                        </div>
                    </section>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {portfolios.map((portfolio) => (
                            <Link key={portfolio.id} href={`/assets/portfolio/${portfolio.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl">{portfolio.name}</CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {portfolio.description || "无描述"}
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {portfolio.strategyMode === 'GRID' ? (
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <Grid3X3 size={20} />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                                    <List size={20} />
                                                </div>
                                            )}
                                            <EditPortfolioDialog portfolio={portfolio} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 grayscale opacity-80 group-hover:grayscale-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-zinc-500">
                                                {portfolio.strategyMode === 'GRID' ? '网格模式' : '常规模式'}
                                            </span>
                                            <span className="text-zinc-300">|</span>
                                            <span className="text-xs font-medium text-zinc-500">
                                                {portfolio._count.assets} 个品种
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-300" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
