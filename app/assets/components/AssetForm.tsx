'use client';

import { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { createAsset } from '@/app/assets/lib/actions';
import { Plus } from 'lucide-react';

interface AssetFormProps {
    portfolioId: string;
    strategyMode: string;
}

export default function AssetForm({ portfolioId, strategyMode }: AssetFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const data: any = {
            name: formData.get('name') as string,
            symbol: formData.get('symbol') as string,
            note: formData.get('note') as string,
            portfolioId,
        };

        if (strategyMode === 'GRID') {
            data.pressurePrice = parseFloat(formData.get('pressurePrice') as string) || 0;
            data.supportPrice = parseFloat(formData.get('supportPrice') as string) || 0;
            data.gridStep = parseFloat(formData.get('gridStep') as string) || 0;
            data.gridAmount = parseFloat(formData.get('gridAmount') as string) || 0;
        }

        try {
            await createAsset(data);
            setOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Plus size={18} />
                    添加品种
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>添加投资品种</DialogTitle>
                        <DialogDescription>
                            {strategyMode === 'GRID'
                                ? "正在为网格组合添加品种，请输入网格运行参数。"
                                : "输入品种的基础信息。"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">品种名称</Label>
                                <Input id="name" name="name" placeholder="例如：中概互联网" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="symbol">代码 (选填)</Label>
                                <Input id="symbol" name="symbol" placeholder="513050" />
                            </div>
                        </div>

                        {strategyMode === 'GRID' && (
                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="pressurePrice">压力位 (最高价)</Label>
                                    <Input id="pressurePrice" name="pressurePrice" type="number" step="0.001" placeholder="0.000" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="supportPrice">支撑位 (最低价)</Label>
                                    <Input id="supportPrice" name="supportPrice" type="number" step="0.001" placeholder="0.000" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gridStep">网格步长 (%)</Label>
                                    <Input id="gridStep" name="gridStep" type="number" step="0.1" placeholder="5.0" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gridAmount">单格资金</Label>
                                    <Input id="gridAmount" name="gridAmount" type="number" placeholder="2000" required />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="note">备注</Label>
                            <Textarea
                                id="note"
                                name="note"
                                placeholder="初次建仓记录或备注..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "添加中..." : "确认添加"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
