"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DittoError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 在控制台输出方便排查
        console.error("Ditto D1 Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm p-8 flex flex-col items-center space-y-6">
                <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500">
                    <AlertCircle size={40} />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">数据获取失败</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        网页君正在保护状态中... 从 D1 数据库获取排版数据的请求中断了，这可能是首次冷启动超时或者网络波动引起的。
                    </p>
                    {error.digest && (
                        <p className="text-xs text-red-400 font-mono bg-red-50 dark:bg-red-900/10 p-2 rounded-md mt-4">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>

                <div className="w-full h-[1px] bg-zinc-100 dark:bg-zinc-800 my-4" />
                
                <div className="flex w-full flex-col sm:flex-row items-center gap-3">
                    <Button onClick={() => reset()} className="w-full gap-2 bg-pink-500 hover:bg-pink-600 text-white">
                        <RefreshCw size={16} />
                        重新请求
                    </Button>
                    <Link href="/" className="w-full">
                        <Button variant="outline" className="w-full gap-2">
                            <Home size={16} />
                            返回主页
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
