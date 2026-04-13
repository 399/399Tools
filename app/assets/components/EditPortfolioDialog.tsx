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
import { Textarea } from "@/components/ui/textarea";
import { updatePortfolio } from '@/app/assets/lib/actions';
import { Pencil } from 'lucide-react';

interface EditPortfolioDialogProps {
    portfolio: {
        id: string;
        name: string;
        description: string | null;
    };
    trigger?: React.ReactNode;
}

export default function EditPortfolioDialog({ portfolio, trigger }: EditPortfolioDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        try {
            await updatePortfolio(portfolio.id, { name, description });
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                        <Pencil size={14} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>编辑投资组合</DialogTitle>
                        <DialogDescription>
                            修改组合的基础信息。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">组合名称</Label>
                            <Input
                                id="edit-name"
                                name="name"
                                defaultValue={portfolio.name}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">描述 (选填)</Label>
                            <Textarea
                                id="edit-description"
                                name="description"
                                defaultValue={portfolio.description || ''}
                                placeholder="该组合的投资逻辑或备忘..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "保存中..." : "保存修改"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
