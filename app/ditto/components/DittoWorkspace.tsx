"use client";

import { useState, useRef, useEffect } from "react";
import BlockNodeComponent from "./BlockNode";
import { ZoomIn, ZoomOut, Maximize, Layers, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DittoNodeData {
  id: string;
  name: string;
  ratio: number;
  direction?: "row" | "col"; 
  children?: DittoNodeData[];
}

interface DittoWorkspaceProps {
  width: number;
  height: number;
  initialData?: DittoNodeData;
  onDataChange?: (data: DittoNodeData) => void;
}

export default function DittoWorkspace({ width, height, initialData, onDataChange }: DittoWorkspaceProps) {
  const defaultRoot: DittoNodeData = {
    id: "root",
    name: "空间 1",
    ratio: 1,
  };

  const [rootNode, setRootNode] = useState<DittoNodeData>(initialData ?? defaultRoot);
  
  // History State
  const [history, setHistory] = useState<DittoNodeData[]>([]);
  const [future, setFuture] = useState<DittoNodeData[]>([]);

  const commitChange = (newState: DittoNodeData) => {
     setHistory(prev => [...prev, rootNode]);
     setFuture([]);
     setRootNode(newState);
     onDataChange?.(newState);
  };
  // Scan tree to find highest existing name number
  const findMaxNameNumber = (node: DittoNodeData): number => {
    let max = 0;
    const match = node.name.match(/^空间\s*(\d+)$/);
    if (match) max = parseInt(match[1], 10);
    if (node.children) {
      for (const child of node.children) {
        max = Math.max(max, findMaxNameNumber(child));
      }
    }
    return max;
  };

  const nameCounter = useRef(findMaxNameNumber(initialData ?? defaultRoot) + 1);

  const getNextName = () => {
    const name = `空间 ${nameCounter.current}`;
    nameCounter.current += 1;
    return name;
  };

  const [zoom, setZoom] = useState(1);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [lockedNodeId, setLockedNodeId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateFitZoom = () => {
    if (containerRef.current) {
        const padding = 120; 
        const availableW = containerRef.current.clientWidth - padding;
        const availableH = containerRef.current.clientHeight - padding;
        
        const scaleW = availableW / width;
        const scaleH = availableH / height;
        
        let newZoom = Math.min(scaleW, scaleH);
        if (newZoom > 10) newZoom = 10; 
        setZoom(newZoom);
    }
  };

  useEffect(() => {
    calculateFitZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const updateNode = (
    node: DittoNodeData,
    id: string,
    modifier: (n: DittoNodeData) => DittoNodeData
  ): DittoNodeData => {
    if (node.id === id) {
      return modifier({ ...node });
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map((c) => updateNode(c, id, modifier)),
      };
    }
    return node;
  };

  const handleUpdateNode = (id: string, modifier: (n: DittoNodeData) => DittoNodeData) => {
    commitChange(updateNode(rootNode, id, modifier));
  };

  const handleRemoveNode = (id: string) => {
    if (id === "root") {
       commitChange({ ...rootNode, direction: undefined, children: undefined });
       return;
    }
    const removeNodeRecursive = (node: DittoNodeData): DittoNodeData | null => {
      if (node.id === id) return null;
      if (node.children) {
        const newChildren = node.children
          .map(removeNodeRecursive)
          .filter((c): c is DittoNodeData => c !== null);
          
        if (newChildren.length === 0) {
          return { ...node, children: undefined, direction: undefined };
        }
        return { ...node, children: newChildren };
      }
      return node;
    };
    commitChange(removeNodeRecursive(rootNode) ?? rootNode);
  };

  const undo = () => {
     if (history.length === 0) return;
     const pastState = history[history.length - 1];
     setHistory(h => h.slice(0, -1));
     setFuture(f => [rootNode, ...f]);
     setRootNode(pastState);
     setLockedNodeId(null);
     setActiveNodeId(null);
  }

  const redo = () => {
     if (future.length === 0) return;
     const nextState = future[0];
     setFuture(f => f.slice(1));
     setHistory(h => [...h, rootNode]);
     setRootNode(nextState);
     setLockedNodeId(null);
     setActiveNodeId(null);
  }

  const enrichTreeAndRender = (node: DittoNodeData, actualW: number, actualH: number, depth: number = 0): React.ReactNode => {
    const isContainer = !!node.children && node.children.length > 0;
    const totalRatio = isContainer 
        ? node.children!.reduce((sum, child) => sum + child.ratio, 0) 
        : 1;

    let computedChildren: React.ReactNode[] = [];
    if (isContainer) {
      computedChildren = node.children!.map((child) => {
        const share = child.ratio / totalRatio;
        const cW = node.direction === "row" ? actualW * share : actualW;
        const cH = node.direction === "col" ? actualH * share : actualH;
        return enrichTreeAndRender(child, cW, cH, depth + 1);
      });
    }

    const isSelected = lockedNodeId === node.id || (activeNodeId === node.id && !lockedNodeId);

    return (
      <div key={node.id} className="flex flex-col w-full">
         <div 
           className={`flex flex-col w-full py-1.5 mb-0.5 cursor-pointer rounded-md text-sm transition-colors border border-transparent 
            ${isSelected ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
           style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '8px' }}
           onMouseEnter={() => { if (!lockedNodeId) setActiveNodeId(node.id); }}
           onMouseLeave={() => { if (!lockedNodeId && activeNodeId === node.id) setActiveNodeId(null); }}
           onClick={(e) => {
              e.stopPropagation();
              // Click to lock selection on tree
              if (lockedNodeId === node.id) {
                 setLockedNodeId(null);
                 setActiveNodeId(null);
              } else {
                 setLockedNodeId(node.id);
                 setActiveNodeId(node.id);
              }
           }}
         >
           <div className="flex items-center w-full justify-between">
              <span className={`flex-1 truncate ${isSelected ? 'text-pink-600 dark:text-pink-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>{node.name}</span>
              {isContainer && (
                <div className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 rounded-full ml-2">
                  {node.children!.length} 块
                </div>
              )}
           </div>

           {isSelected && (
              <div className="mt-1 space-y-1 cursor-default text-[10px] text-zinc-500">
                 空间已被选中激活
              </div>
           )}
         </div>
         
         {isContainer && (
           <div className="flex flex-col relative before:content-[''] before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
             {computedChildren}
           </div>
         )}
      </div>
    );
  };

  return (
    <div 
       ref={containerRef} 
       className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 overflow-hidden border-t border-zinc-200 dark:border-zinc-800"
       style={{ backgroundImage: 'radial-gradient(var(--tw-colors-zinc-300) 1px, transparent 0)', backgroundSize: '40px 40px' }} 
       onClick={() => {
          // Clear lock explicitly when clicking canvas void exterior edges
          setLockedNodeId(null);
          setActiveNodeId(null);
       }}
    >
      
      {/* Top Centered Operations Toolbar (Undo/Redo) - Positioned in the global header */}
      <div 
         className="fixed top-[18px] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 bg-zinc-100/80 backdrop-blur-sm dark:bg-zinc-800/80 px-1 py-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm"
         onClick={e => e.stopPropagation()}   
      >
         <Button 
            variant="ghost" 
            size="sm" 
            className="text-zinc-600 dark:text-zinc-300 rounded-md hover:bg-white dark:hover:bg-zinc-700 h-7 text-xs font-medium px-2.5"
            onClick={undo}
            disabled={history.length === 0}
            title="撤销"
         >
            <Undo2 className="w-3.5 h-3.5 mr-1.5" />撤销
         </Button>
         <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-600 mx-0.5"></div>
         <Button 
            variant="ghost" 
            size="sm" 
            className="text-zinc-600 dark:text-zinc-300 rounded-md hover:bg-white dark:hover:bg-zinc-700 h-7 text-xs font-medium px-2.5"
            onClick={redo}
            disabled={future.length === 0}
            title="重做"
         >
            重做<Redo2 className="w-3.5 h-3.5 ml-1.5" />
         </Button>
      </div>

      {/* Floating Layer Tree Panel */}
      <div 
         className="absolute top-6 left-6 z-50 w-64 max-h-[80vh] flex flex-col bg-white/95 backdrop-blur-xl dark:bg-zinc-900/95 rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden"
         onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-950">
           <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-500" />
              <span className="font-bold text-[13px] text-zinc-800 dark:text-zinc-200">区域导航</span>
           </div>
           {lockedNodeId && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500" onClick={() => { setLockedNodeId(null); setActiveNodeId(null); }}>
                 解除选中
              </Button>
           )}
        </div>
        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
           {enrichTreeAndRender(rootNode, width, height)}
        </div>
      </div>

      {/* Global Zoom Toolbar */}
      <div 
         className="absolute bottom-8 right-8 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-md dark:bg-zinc-900/90 p-1.5 rounded-xl shadow-lg border border-zinc-200/50 dark:border-zinc-800/50"
         onClick={e => e.stopPropagation()}
      >
         <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" onClick={() => setZoom(z => Math.max(0.01, z - 0.1))} title="缩图 (-)">
           <ZoomOut className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
         </Button>
         <div className="text-[11px] font-mono w-12 text-center text-zinc-600 dark:text-zinc-400 font-bold">
            {Math.round(zoom * 100)}%
         </div>
         <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" onClick={() => setZoom(z => Math.min(20, z + 0.1))} title="放图 (+)">
           <ZoomIn className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
         </Button>
         <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1"></div>
         <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" onClick={calculateFitZoom} title="适配屏幕重置">
           <Maximize className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
         </Button>
      </div>

      <div className="flex-1 w-full h-full relative flex items-center justify-center pointer-events-none">
         <div 
           className="bg-white dark:bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex origin-center transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform relative pointer-events-auto"
           style={{
             width: `${width}px`,
             height: `${height}px`,
             flexShrink: 0,
             transform: `scale(${zoom})`,
           }}
           onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                 setLockedNodeId(null);
                 setActiveNodeId(null);
              }
           }}
           onMouseLeave={() => setActiveNodeId(null)}
         >
           
           <BlockNodeComponent 
             node={rootNode} 
             onUpdate={handleUpdateNode}
             onRemove={handleRemoveNode}
             isRoot={true} 
             actualWidth={width}
             actualHeight={height}
             zoom={zoom}
             activeNodeId={activeNodeId}
             setActiveNodeId={setActiveNodeId}
             lockedNodeId={lockedNodeId}
             setLockedNodeId={setLockedNodeId} 
             getNextName={getNextName}
           />
           
           {/* Static CAD Dimension lines for the master board */}
           <div className="absolute inset-x-0 -bottom-8 h-px bg-zinc-300 dark:bg-zinc-700 pointer-events-none before:absolute before:left-0 before:-top-1.5 before:w-px before:h-3 before:bg-zinc-400 after:absolute after:right-0 after:-top-1.5 after:w-px after:h-3 after:bg-zinc-400">
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-[10px] bg-zinc-100 dark:bg-zinc-950 px-2 text-zinc-500 font-mono tracking-widest block" style={{ transform: `scale(${1/zoom})` }}>{width}</span>
             </div>
           </div>
           <div className="absolute inset-y-0 -right-8 w-px bg-zinc-300 dark:bg-zinc-700 pointer-events-none before:absolute before:top-0 before:-left-1.5 before:w-3 before:h-px before:bg-zinc-400 after:absolute after:bottom-0 after:-left-1.5 after:w-3 after:h-px before:bg-zinc-400">
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-[10px] bg-zinc-100 dark:bg-zinc-950 py-2 text-zinc-500 font-mono tracking-widest block" style={{ transform: `scale(${1/zoom})` }}>{height}</span>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}
