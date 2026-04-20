export const runtime = 'edge';
import { getWorkspaces } from './lib/actions';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Clock, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateWorkspaceDialog from './components/CreateWorkspaceDialog';
import WorkspaceActions from './components/WorkspaceActions';

export const dynamic = 'force-dynamic';

function formatTime(date: Date) {
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

export default async function DittoListPage() {
    const workspaces = await getWorkspaces();

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Ditto</h1>
                        <span className="text-xs text-zinc-500">空间分配与排版工具</span>
                    </div>
                </div>
                <CreateWorkspaceDialog />
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-10">
                {workspaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center space-y-4 p-12">
                        <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                            <LayoutGrid size={48} />
                        </div>
                        <h3 className="text-xl font-semibold">暂无空间</h3>
                        <p className="text-zinc-500 max-w-sm">
                            点击右上角"新建空间"来创建您的第一个空间分配方案。
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {workspaces.map((ws) => (
                            <div key={ws.id} className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg hover:border-pink-200 dark:hover:border-pink-800 transition-all duration-200 overflow-hidden">
                                {/* Gradient top bar */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 to-purple-500" />

                                <Link href={`/ditto/${ws.id}`} className="block p-5 pb-3">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate group-hover:text-pink-600 transition-colors">
                                        {ws.name}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Ruler size={12} />
                                            {ws.width} × {ws.height} mm
                                        </span>
                                    </div>
                                </Link>

                                {/* Footer */}
                                <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                        <Clock size={11} />
                                        {formatTime(ws.updatedAt)}
                                    </span>
                                    <WorkspaceActions workspaceId={ws.id} workspaceName={ws.name} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
