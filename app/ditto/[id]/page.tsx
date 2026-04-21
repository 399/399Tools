import { getWorkspace } from '../lib/actions';
import { notFound } from 'next/navigation';
import DittoEditorClient from './DittoEditorClient';

export const dynamic = 'force-dynamic';

export default async function DittoEditorPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const workspace = await getWorkspace(id);

    if (!workspace) {
        notFound();
    }

    return (
        <DittoEditorClient
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            width={workspace.width}
            height={workspace.height}
            initialData={workspace.data}
        />
    );
}

export const runtime = "edge";
