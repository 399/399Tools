import { Loader2 } from "lucide-react";

export default function DittoLoading() {
    return (
        <div className="min-h-[60vh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-5 rounded-2xl">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
            <div className="text-center space-y-1">
                <p className="text-zinc-700 dark:text-zinc-200 font-medium">正在加载...</p>
                <p className="text-xs text-zinc-500 animate-pulse">正在从边缘节点加载您的排版空间，请稍候...</p>
            </div>
        </div>
    );
}

export const runtime = "edge";
