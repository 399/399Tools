'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getWorkspaces() {
    return await prisma.dittoWorkspace.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            name: true,
            width: true,
            height: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function getWorkspace(id: string) {
    return await prisma.dittoWorkspace.findUnique({
        where: { id },
    });
}

export async function createWorkspace(data: {
    name: string;
    width: number;
    height: number;
}) {
    const initialData = JSON.stringify({
        id: 'root',
        name: '空间 1',
        ratio: 1,
    });

    const workspace = await prisma.dittoWorkspace.create({
        data: {
            name: data.name,
            width: data.width,
            height: data.height,
            data: initialData,
        },
    });
    revalidatePath('/ditto');
    return workspace;
}

export async function updateWorkspaceData(id: string, nodeData: string) {
    // nodeData is the JSON-serialized DittoNodeData tree
    await prisma.dittoWorkspace.update({
        where: { id },
        data: { data: nodeData },
    });
    return { success: true };
}

export async function renameWorkspace(id: string, name: string) {
    await prisma.dittoWorkspace.update({
        where: { id },
        data: { name },
    });
    revalidatePath('/ditto');
    return { success: true };
}

export async function deleteWorkspace(id: string) {
    await prisma.dittoWorkspace.delete({
        where: { id },
    });
    revalidatePath('/ditto');
    return { success: true };
}
