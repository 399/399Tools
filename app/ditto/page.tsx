"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import DittoWorkspace from "./components/DittoWorkspace";

export default function DittoPage() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [formWidth, setFormWidth] = useState(800);
  const [formHeight, setFormHeight] = useState(600);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDimensions({ width: formWidth, height: formHeight });
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex flex-row items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
             <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Ditto</h1>
             <span className="text-xs text-zinc-500">空间分配与排版工具</span>
          </div>
        </div>
        {dimensions && (
          <div className="flex items-center gap-4 text-sm font-medium bg-zinc-100 text-zinc-600 dark:text-zinc-300 dark:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
            实际尺寸: {dimensions.width}mm &times; {dimensions.height}mm
            <Button size="sm" variant="outline" onClick={() => setDimensions(null)} className="ml-2 h-7 px-3 text-xs text-pink-600 border-pink-200 hover:bg-pink-50 hover:text-pink-700">
              重置参数
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full flex items-center justify-center p-6 overflow-hidden relative">
        {!dimensions ? (
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
            <Card className="shadow-2xl border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-pink-400 to-purple-500" />
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl">新建空间分配卷</CardTitle>
                <CardDescription className="text-base mt-2">
                  设定目标区域的物理极限参数（单位：mm），系统将按照实际比例为您渲染可视化的拆分控制。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="width" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">宽度 (单位: mm)</Label>
                      <Input
                        id="width"
                        type="number"
                        value={formWidth}
                        onChange={(e) => setFormWidth(Number(e.target.value))}
                        min={10}
                        max={100000}
                        className="text-lg py-6"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="height" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">高度 (单位: mm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={formHeight}
                        onChange={(e) => setFormHeight(Number(e.target.value))}
                        min={10}
                        max={100000}
                        className="text-lg py-6"
                      />
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full bg-pink-500 hover:bg-pink-600 text-white shadow-md hover:shadow-lg transition-all rounded-xl py-6 text-lg font-semibold">
                    进入自动适配台
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <DittoWorkspace width={dimensions.width} height={dimensions.height} />
        )}
      </main>
    </div>
  );
}
