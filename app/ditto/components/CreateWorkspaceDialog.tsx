'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { createWorkspace } from '../lib/actions';

export default function CreateWorkspaceDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const ws = await createWorkspace({
                name: name.trim(),
                width,
                height,
            });
            setOpen(false);
            setName('');
            setWidth(800);
            setHeight(600);
            router.push(`/ditto/${ws.id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white">
                    <Plus size={18} />
                    新建空间
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>新建空间分配方案</DialogTitle>
                        <DialogDescription>
                            设定空间名称和物理尺寸（单位：mm）。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="ws-name">空间名称</Label>
                            <Input
                                id="ws-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例如：客厅电视墙"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ws-width">宽度 (mm)</Label>
                                <Input
                                    id="ws-width"
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    min={10}
                                    max={100000}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ws-height">高度 (mm)</Label>
                                <Input
                                    id="ws-height"
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    min={10}
                                    max={100000}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-pink-500 hover:bg-pink-600 text-white">
                            {loading ? '创建中...' : '创建并进入'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
