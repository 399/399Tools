'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { renameWorkspace, deleteWorkspace } from '../lib/actions';

interface WorkspaceActionsProps {
    workspaceId: string;
    workspaceName: string;
}

export default function WorkspaceActions({ workspaceId, workspaceName }: WorkspaceActionsProps) {
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [newName, setNewName] = useState(workspaceName);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRename(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        try {
            await renameWorkspace(workspaceId, newName.trim());
            setRenameOpen(false);
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setLoading(true);
        try {
            await deleteWorkspace(workspaceId);
            setDeleteOpen(false);
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600" onClick={(e) => e.preventDefault()}>
                        <MoreHorizontal size={14} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setNewName(workspaceName); setRenameOpen(true); }}>
                        <Pencil size={14} className="mr-2" />
                        重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-red-600 focus:text-red-600">
                        <Trash2 size={14} className="mr-2" />
                        删除
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rename Dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent className="sm:max-w-[380px]">
                    <form onSubmit={handleRename}>
                        <DialogHeader>
                            <DialogTitle>重命名空间</DialogTitle>
                            <DialogDescription>修改空间方案的名称。</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="rename-input">新名称</Label>
                            <Input
                                id="rename-input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="mt-2"
                                autoFocus
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? '保存中...' : '确认'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除空间方案「{workspaceName}」吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
                            {loading ? '删除中...' : '确认删除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
