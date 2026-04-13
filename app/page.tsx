import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Package, Send, Settings, Terminal, Layout } from "lucide-react";

const tools = [
  {
    name: "9Map Gallery",
    description: "发现并探索城市的各个角落",
    icon: Map,
    href: "/9map",
    color: "text-blue-500",
  },
  {
    name: "9Map Helper",
    description: "快速登记地点信息并同步至飞书",
    icon: Send,
    href: "/feishu_push",
    color: "text-green-500",
  },
  {
    name: "Assets",
    description: "全方位的资产登记与追踪管理",
    icon: Package,
    href: "/assets",
    color: "text-purple-500",
  },
  {
    name: "Ditto",
    description: "空间分配与参数化排版工具",
    icon: Layout,
    href: "/ditto",
    color: "text-pink-500",
  },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            NAS Tool Station
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl">
            欢迎来到个人工具站。在这里管理并使用你的所有小工具。
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.name} className="hover:shadow-lg transition-all border-zinc-200 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center space-x-4 space-y-0">
                <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 ${tool.color}`}>
                  <tool.icon size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl">{tool.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm line-clamp-2">
                  {tool.description}
                </CardDescription>
                <Link href={tool.href} className="block">
                  <Button className="w-full" variant="outline">
                    打开工具
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}

          {/* Placeholder for future tools */}
          <Card className="border-dashed border-2 bg-transparent opacity-60">
            <CardHeader className="flex flex-row items-center space-x-4 space-y-0">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-400">
                <Settings size={24} />
              </div>
              <div>
                <CardTitle className="text-xl text-zinc-400">更多工具</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                正在开发中，敬请期待更多精彩功能...
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <footer className="pt-12 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-sm text-zinc-400">
            &copy; {new Date().getFullYear()} NAS Tool Station. Powered by Next.js.
          </p>
        </footer>
      </div>
    </div>
  );
}
