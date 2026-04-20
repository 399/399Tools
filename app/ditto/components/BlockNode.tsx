"use client";

import { DittoNodeData } from "./DittoWorkspace";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface BlockNodeProps {
  node: DittoNodeData;
  onUpdate: (id: string, modifier: (n: DittoNodeData) => DittoNodeData) => void;
  onRemove: (id: string) => void;
  isRoot?: boolean;
  actualWidth: number;
  actualHeight: number;
  zoom: number; 
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  lockedNodeId: string | null;
  setLockedNodeId: (id: string | null) => void;
  getNextName: () => string;
}

export type SplitDirection = "row" | "col";
const generateId = () => Math.random().toString(36).substr(2, 9);

function InlineEditor({ initialPx, initialRatio, onChange }: { initialPx: number, initialRatio: number, onChange: (val: number, mode: "px"|"ratio") => void }) {
   const [mode, setMode] = useState<"px"|"ratio">("ratio"); // Default to displaying ratio per user instruction
   const [val, setVal] = useState(String(mode === "px" ? Math.round(initialPx*10)/10 : Math.round(initialRatio*100)/100));

   useEffect(() => {
      setVal(String(mode === "px" ? Math.round(initialPx*10)/10 : Math.round(initialRatio*100)/100));
   }, [initialPx, initialRatio, mode]);

   return (
      <div className="flex text-[11px] bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.1)] rounded-[4px] overflow-hidden pointer-events-auto">
         <button onClick={(e) => { e.stopPropagation(); setMode(m => m === "px" ? "ratio" : "px"); }} className="bg-zinc-50 px-1.5 py-0.5 hover:bg-zinc-100 font-medium text-zinc-500 border-r border-zinc-200 transition-colors">
           {mode === "px" ? "数值 ⇌" : "比例 ⇌"}
         </button>
         <input 
            className="w-[60px] bg-white text-center focus:outline-none font-mono py-0.5 text-zinc-800"
            value={val}
            onClick={e => e.stopPropagation()}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
               if (e.key === "Enter") {
                  const num = Number(val);
                  if (!isNaN(num) && num > 0) onChange(num, mode);
               }
               e.stopPropagation();
            }}
         />
      </div>
   )
}

function CadDimension({ width, height, axis, inverseZoom }: { width: number, height: number, axis: "top"|"left", inverseZoom: number }) {
  if (axis === "top") {
     return (
        <div className="absolute -top-3 left-0 right-0 h-px bg-zinc-300 pointer-events-none before:absolute before:left-0 before:-top-1 before:h-2 before:w-px before:bg-zinc-400 after:absolute after:right-0 after:-top-1 after:h-2 after:w-px after:bg-zinc-400 z-50">
           <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ transform: `scale(${inverseZoom})` }} className="bg-zinc-50 px-1 text-[11px] font-mono text-zinc-700 tracking-wider">
                 {Math.round(width*10)/10}
              </div>
           </div>
        </div>
     );
  }
  return (
      <div className="absolute -left-3 top-0 bottom-0 w-px bg-zinc-300 pointer-events-none before:absolute before:top-0 before:-left-1 before:w-2 before:h-px before:bg-zinc-400 after:absolute after:bottom-0 after:-left-1 after:w-2 after:h-px after:bg-zinc-400 z-50">
         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ transform: `scale(${inverseZoom})` }} className="bg-zinc-50 py-1 text-[11px] font-mono text-zinc-700 tracking-wider">
               {Math.round(height*10)/10}
            </div>
         </div>
      </div>
  );
}

export default function BlockNodeComponent({ 
  node, 
  onUpdate, 
  onRemove, 
  isRoot, 
  actualWidth, 
  actualHeight, 
  zoom,
  activeNodeId,
  setActiveNodeId,
  lockedNodeId,
  setLockedNodeId,
  getNextName
}: BlockNodeProps) {

  const isContainer = !!node.children && node.children.length > 0;
  
  // Logical states exactly matching user specification
  const isSelected = lockedNodeId === node.id;
  const isHovered = activeNodeId === node.id;
  const showDimensions = isSelected || isHovered;

  const totalRatio = isContainer 
      ? node.children!.reduce((sum, child) => sum + child.ratio, 0) 
      : 1;

  const inverseZoom = 1 / zoom;

  const handleSplitPlus = (axis: "row" | "col", e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isContainer) {
          if (node.direction === axis) {
             onUpdate(node.id, (n) => ({
                 ...n, 
                 children: [...n.children!, { id: generateId(), name: getNextName(), ratio: 1 }]
             }));
          } else {
             // Cross-axis split: wrap existing children into a new group node,
             // then split the current node in the new axis direction.
             onUpdate(node.id, (n) => {
                const wrappedGroup = {
                   id: generateId(),
                   name: getNextName(),
                   ratio: 1,
                   direction: n.direction,
                   children: n.children,
                };
                return {
                   ...n,
                   direction: axis,
                   children: [
                      wrappedGroup,
                      { id: generateId(), name: getNextName(), ratio: 1 },
                   ],
                };
             });
          }
      } else {
         onUpdate(node.id, (n) => ({
            ...n,
            direction: axis,
            children: [
               { id: generateId(), name: getNextName(), ratio: 1 },
               { id: generateId(), name: getNextName(), ratio: 1 }
            ]
         }));
      }
  }

  const handleSplitMinus = (axis: "row" | "col", e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!isContainer || node.direction !== axis) return;
      onUpdate(node.id, (n) => {
          if (n.children!.length <= 2) {
             // When removing the last split, check if the remaining child
             // is a group (from a prior cross-axis split). If so, unwrap it.
             const remaining = n.children![0];
             if (remaining.children && remaining.direction) {
                return { ...n, direction: remaining.direction, children: remaining.children };
             }
             return { ...n, direction: undefined, children: undefined };
          }
          return { ...n, children: n.children!.slice(0, -1) };
      });
  }

  const handleChildSizeMutation = (childId: string, newVal: number, mode: "px" | "ratio") => {
      if (mode === "ratio") {
          onUpdate(node.id, (n) => ({
              ...n, 
              children: n.children!.map(c => c.id === childId ? { ...c, ratio: newVal } : c)
          }));
          return;
      }
      const totalPhysical = node.direction === "row" ? actualWidth : actualHeight;
      if (newVal >= totalPhysical) {
          alert(`数值不能等于或超过父包裹承载尺寸 (${totalPhysical} mm)`);
          return;
      }
      
      const currentPxs = node.children!.map(c => (c.ratio / totalRatio) * totalPhysical);
      const childIndex = node.children!.findIndex(c => c.id === childId);
      const diff = newVal - currentPxs[childIndex];
      
      let otherRatioSum = 0;
      node.children!.forEach((c, idx) => { if (idx !== childIndex) otherRatioSum += c.ratio; });
      
      const newChildren = [...node.children!];
      newChildren[childIndex] = { ...newChildren[childIndex], ratio: newVal };
      
      node.children!.forEach((c, idx) => {
         if (idx !== childIndex) {
            const shareOfRemaining = c.ratio / otherRatioSum;
            const newSiblingPx = Math.max(0.1, currentPxs[idx] - (diff * shareOfRemaining));
            newChildren[idx] = { ...newChildren[idx], ratio: newSiblingPx };
         }
      });
      onUpdate(node.id, (n) => ({ ...n, children: newChildren }));
  };

  const getBorderColor = () => {
     if (isSelected) return '#3b82f6'; // Blue
     if (isHovered) return '#18181b'; // Black hover
     return '#18181b'; // Black unselected
  }

  return (
    <div
      className="relative group transition-colors duration-100 flex pointer-events-auto"
      style={{
        flexGrow: node.ratio,
        flexBasis: 0,
        flexDirection: node.direction === "col" ? "column" : "row",
        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "transparent",
        borderWidth: `${inverseZoom}px`, 
        borderColor: getBorderColor(),
        borderStyle: 'solid',
        zIndex: isSelected ? 30 : (isHovered ? 20 : 0),
        boxSizing: 'border-box'
      }}
      onMouseOver={(e) => {
        e.stopPropagation();
        if (activeNodeId !== node.id) setActiveNodeId(node.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setLockedNodeId(node.id);
      }}
    >
      
      {/* CAD dimensions shown on hover or select. Exclude root to prevent fighting with fixed global labels */}
      {showDimensions && !isRoot && (
         <>
           <CadDimension width={actualWidth} height={actualHeight} axis="top" inverseZoom={inverseZoom} />
           <CadDimension width={actualWidth} height={actualHeight} axis="left" inverseZoom={inverseZoom} />
         </>
      )}

      {/* 
        CAD + / - Horizontal controls (Top) 
      */}
      {isSelected && (
        <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-full pb-2 z-50 pointer-events-none" style={{ transform: `scale(${inverseZoom}) translate(50%, 0)`, transformOrigin: 'bottom center' }}>
           <div className="flex bg-white shadow-md rounded-md border border-zinc-200 overflow-hidden pointer-events-auto">
              <Button size="icon" variant="ghost" className="h-[26px] w-[28px] rounded-none text-zinc-600 bg-zinc-50 hover:bg-zinc-200" onClick={(e) => handleSplitPlus("row", e)}><Plus strokeWidth={3} className="w-4 h-4"/></Button>
              <div className="w-px bg-zinc-200"></div>
              <Button size="icon" variant="ghost" className="h-[26px] w-[28px] rounded-none text-zinc-600 bg-zinc-50 hover:bg-zinc-200" onClick={(e) => handleSplitMinus("row", e)}><Minus strokeWidth={3} className="w-4 h-4"/></Button>
           </div>
        </div>
      )}

      {/* 
        CAD + / - Vertical controls (Right) 
      */}
      {isSelected && (
        <div className="absolute right-0 top-1/2 translate-y-1/2 translate-x-full pl-2 z-50 pointer-events-none" style={{ transform: `scale(${inverseZoom}) translate(0, 50%)`, transformOrigin: 'center left' }}>
           <div className="flex flex-col bg-white shadow-md rounded-md border border-zinc-200 overflow-hidden pointer-events-auto">
              <Button size="icon" variant="ghost" className="h-[26px] w-[28px] rounded-none text-zinc-600 bg-zinc-50 hover:bg-zinc-200" onClick={(e) => handleSplitPlus("col", e)}><Plus strokeWidth={3} className="w-4 h-4"/></Button>
              <div className="h-px bg-zinc-200"></div>
              <Button size="icon" variant="ghost" className="h-[26px] w-[28px] rounded-none text-zinc-600 bg-zinc-50 hover:bg-zinc-200" onClick={(e) => handleSplitMinus("col", e)}><Minus strokeWidth={3} className="w-4 h-4"/></Button>
           </div>
        </div>
      )}

      {/* 
         State 4: Selected Container -> Show Ratio/Px Editors for its Children
         User spec: "选中（还有子空间）：显示空间加减，显示比例/数值"
      */}
      {isSelected && isContainer && (
         <div className="absolute inset-0 pointer-events-none z-40 flex" style={{ flexDirection: node.direction === "col" ? "column" : "row" }}>
            {node.children!.map(child => {
               const childShare = child.ratio / totalRatio;
               const childW = node.direction === "row" ? actualWidth * childShare : actualWidth;
               const childH = node.direction === "col" ? actualHeight * childShare : actualHeight;
               
               return (
                  <div key={`input-${child.id}`} style={{ flexGrow: child.ratio, flexBasis: 0 }} className="relative flex justify-center items-center">
                     <div 
                        className={`absolute ${node.direction === "row" ? "top-0 -translate-y-1/2" : "left-0 -translate-x-1/2"} pointer-events-auto`}
                        style={{ transform: `scale(${inverseZoom})` }}   
                     >
                        <InlineEditor 
                           initialPx={node.direction === "row" ? childW : childH}
                           initialRatio={child.ratio}
                           onChange={(val, m) => handleChildSizeMutation(child.id, val, m)}
                        />
                     </div>
                  </div>
               )
            })}
         </div>
      )}

      {/* Legacy top-right delete area - simplified black block */}
      {isSelected && (!isRoot || isContainer) && (
         <div 
           className="absolute top-0 right-0 pointer-events-none z-50 pt-1.5 pr-1.5" 
           style={{ transform: `scale(${inverseZoom})`, transformOrigin: 'top right' }}
         >
           <Button variant="secondary" size="icon" className="h-7 w-9 pointer-events-auto bg-[#31363f] text-white hover:bg-black rounded-sm shadow-md" onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}>
              <Trash2 className="h-4 w-4" />
           </Button>
         </div>
      )}

      {/* Children render */}
      {isContainer && node.children?.map((child) => {
        const share = child.ratio / totalRatio;
        const childActualWidth = node.direction === "row" ? actualWidth * share : actualWidth;
        const childActualHeight = node.direction === "col" ? actualHeight * share : actualHeight;
        
        return (
          <BlockNodeComponent 
            key={child.id} 
            node={child} 
            onUpdate={onUpdate} 
            onRemove={onRemove}
            isRoot={false}
            actualWidth={childActualWidth}
            actualHeight={childActualHeight}
            zoom={zoom}
            activeNodeId={activeNodeId}
            setActiveNodeId={setActiveNodeId}
            lockedNodeId={lockedNodeId}
            setLockedNodeId={setLockedNodeId}
            getNextName={getNextName}
          />
        )
      })}
    </div>
  );
}
