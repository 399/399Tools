'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Cloud, CloudOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DittoWorkspace from '../components/DittoWorkspace';
import { updateWorkspaceData } from '../lib/actions';
import { DittoNodeData } from '../components/DittoWorkspace';

interface DittoEditorClientProps {
    workspaceId: string;
    workspaceName: string;
    width: number;
    height: number;
    initialData: string;
}

type SaveStatus = 'saved' | 'unsaved' | 'saving';

export default function DittoEditorClient({
    workspaceId,
    workspaceName,
    width,
    height,
    initialData,
}: DittoEditorClientProps) {
    const parsedInitial: DittoNodeData = JSON.parse(initialData);

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

    // Refs for save logic
    const lastSavedDataRef = useRef<string>(initialData);
    const currentDataRef = useRef<DittoNodeData>(parsedInitial);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);

    // Core save function with dirty check
    const save = useCallback(async () => {
        if (isSavingRef.current) return;

        const currentJson = JSON.stringify(currentDataRef.current);
        // Dirty check: skip if data hasn't changed
        if (currentJson === lastSavedDataRef.current) {
            setSaveStatus('saved');
            return;
        }

        isSavingRef.current = true;
        setSaveStatus('saving');

        try {
            await updateWorkspaceData(workspaceId, currentJson);
            lastSavedDataRef.current = currentJson;
            const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
            setLastSavedTime(now);
            setSaveStatus('saved');
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('unsaved');
        } finally {
            isSavingRef.current = false;
        }
    }, [workspaceId]);

    // Debounced auto-save: called whenever data changes
    const scheduleSave = useCallback(() => {
        setSaveStatus('unsaved');
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            save();
        }, 10000); // 10 second debounce
    }, [save]);

    // Callback for DittoWorkspace to report data changes
    const handleDataChange = useCallback((newData: DittoNodeData) => {
        currentDataRef.current = newData;
        scheduleSave();
    }, [scheduleSave]);

    // Ctrl+S / Cmd+S manual save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // Cancel pending debounce and save immediately
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                save();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [save]);

    // beforeunload warning for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const currentJson = JSON.stringify(currentDataRef.current);
            if (currentJson !== lastSavedDataRef.current) {
                e.preventDefault();
                // Modern browsers ignore custom messages but still show a generic prompt
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/ditto">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{workspaceName}</h1>
                        <span className="text-xs text-zinc-500">
                            {width}mm × {height}mm
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Save status indicator */}
                    <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                        style={{
                            borderColor: saveStatus === 'saved' ? '#d4d4d8' : saveStatus === 'saving' ? '#93c5fd' : '#fbbf24',
                            color: saveStatus === 'saved' ? '#71717a' : saveStatus === 'saving' ? '#3b82f6' : '#d97706',
                            backgroundColor: saveStatus === 'saved' ? '#fafafa' : saveStatus === 'saving' ? '#eff6ff' : '#fffbeb',
                        }}
                    >
                        {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
                        {saveStatus === 'saved' && <Cloud size={12} />}
                        {saveStatus === 'unsaved' && <CloudOff size={12} />}
                        {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? (lastSavedTime ? `已保存 ${lastSavedTime}` : '已保存') : '未保存'}
                    </div>

                    {/* Manual save button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => {
                            if (debounceTimerRef.current) {
                                clearTimeout(debounceTimerRef.current);
                                debounceTimerRef.current = null;
                            }
                            save();
                        }}
                    >
                        <Save size={13} />
                        保存
                    </Button>
                </div>
            </header>

            <main className="flex-1 w-full flex items-center justify-center p-6 overflow-hidden relative">
                <DittoWorkspace
                    width={width}
                    height={height}
                    initialData={parsedInitial}
                    onDataChange={handleDataChange}
                />
            </main>
        </div>
    );
}
