'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPortfolio } from '@/app/assets/lib/actions';
import { Plus } from 'lucide-react';

export default function PortfolioForm() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const strategyMode = formData.get('strategyMode') as 'GRID' | 'REGULAR';

        try {
            const portfolio = await createPortfolio({ name, description, strategyMode });
            setOpen(false);
            router.push(`/assets/portfolio/${portfolio.id}`);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                    <Plus size={18} />
                    新建组合
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>新建投资组合</DialogTitle>
                        <DialogDescription>
                            创建一个新的投资组合。请注意，策略模式选定后将不可更改。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">组合名称</Label>
                            <Input id="name" name="name" placeholder="例如：E大网格自学组合" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="strategyMode">策略模式</Label>
                            <Select name="strategyMode" defaultValue="REGULAR" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择计划模式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REGULAR">常规模式 (普通买卖流水)</SelectItem>
                                    <SelectItem value="GRID">网格模式 (精细化网格管理)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">描述 (选填)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="该组合的投资逻辑或备忘..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "创建中..." : "确认创建"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
