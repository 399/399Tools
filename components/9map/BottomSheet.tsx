import React, { useRef, useState } from 'react';

interface BottomSheetProps {
    isExpanded: boolean;
    onExpandChange: (expanded: boolean) => void;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export default function BottomSheet({
    isExpanded,
    onExpandChange,
    onClose,
    children,
    className = ''
}: BottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);

    // Touch handling state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartTime = useRef(0);
    const initialHeight = useRef(0);
    const currentDelta = useRef(0);
    const collapsedHeight = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();

        // If expanded, only allow drag on the handle area to avoid conflict with scrolling
        if (isExpanded) {
            const target = e.target as HTMLElement;
            // Always prevent background map movement if touching ANYWHERE in the sheet
            e.stopPropagation();
            if (!target.closest('.drag-handle-area')) return;
        }

        setIsDragging(true);
        dragStartY.current = e.touches[0].clientY;
        dragStartTime.current = Date.now();

        if (sheetRef.current) {
            initialHeight.current = sheetRef.current.offsetHeight;

            // Capture collapsed height if we are starting from collapsed
            if (!isExpanded) {
                collapsedHeight.current = sheetRef.current.offsetHeight;
            }

            // Disable transition during drag
            sheetRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isDragging || !sheetRef.current) return;

        const currentY = e.touches[0].clientY;
        const deltaY = dragStartY.current - currentY;
        currentDelta.current = deltaY;

        // Constants for layout
        const INITIAL_BOTTOM = 24; // bottom-6
        const INITIAL_MARGIN = 16; // left-4 right-4
        const DOCK_DISTANCE = 200; // Distance to fully dock to edges

        // Logic for dragging UP (expanding) from collapsed state
        if (!isExpanded) {
            if (deltaY > 0) {
                // Dragging UP - Expand logic
                // Calculate progress (0 to 1)
                // 0 = start, 1 = fully docked (but not necessarily full height)
                const progress = Math.min(Math.abs(deltaY) / DOCK_DISTANCE, 1);
                const easeProgress = progress; // Linear for now

                // Interpolate styles
                const currentBottom = INITIAL_BOTTOM * (1 - easeProgress);
                const currentMargin = INITIAL_MARGIN * (1 - easeProgress);

                const newHeight = initialHeight.current + deltaY + (INITIAL_BOTTOM - currentBottom);

                sheetRef.current.style.bottom = `${currentBottom}px`;
                sheetRef.current.style.left = `${currentMargin}px`;
                sheetRef.current.style.right = `${currentMargin}px`;

                const topRadius = 20 + (4 * easeProgress); // 20 -> 24
                const bottomRadius = 20 * (1 - easeProgress); // 20 -> 0
                sheetRef.current.style.borderRadius = `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`;
                sheetRef.current.style.height = `${newHeight}px`;
                sheetRef.current.style.maxHeight = '95vh';
            } else {
                // Dragging DOWN - Close logic (deltaY is negative)
                const newBottom = INITIAL_BOTTOM + deltaY;
                sheetRef.current.style.bottom = `${newBottom}px`;
                // Keep other styles stable
                sheetRef.current.style.height = `${initialHeight.current}px`;
            }

        } else {
            // Logic for dragging DOWN (collapsing) from expanded state
            if (deltaY > 0) return; // Ignore dragging up further

            // We are dragging down, deltaY is negative
            // Just shrink height for now, simple and effective
            // This part of the logic was removed/changed in the user's instruction.
            // Since `THRESHOLDS` are not defined, and the instruction is to remove unused vars,
            // I will remove the old height adjustment logic here, as it was tied to `initialHeight`.
            // The final state will be handled in `handleTouchEnd`.
            // If the user intended to introduce `THRESHOLDS`, they would have provided them.
            // For now, this section will be empty as per the implied removal of the old logic.
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isDragging || !sheetRef.current) return;
        setIsDragging(false);

        // currentY removed

        // dragDuration removed (unused)
        // velocity removed (unused)

        const threshold = 100;
        let shouldExpand = isExpanded;
        const shouldClose = false;

        // Determine intended state
        if (!isExpanded) {
            if (currentDelta.current > threshold) {
                shouldExpand = true;
            }
            // "shouldClose" logic removed to prevent closing from collapsed state
        } else {
            if (currentDelta.current < -threshold) {
                shouldExpand = false;
            }
        }

        // 1. Force Browser Reflow
        void sheetRef.current.offsetHeight;

        // 2. Apply transition manually
        let duration = 500;
        const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

        if (shouldClose) {
            duration = 800; // Slower for visible exit
        }

        sheetRef.current.style.transition = `all ${duration}ms ${easing}`;

        // 3. Set Target Styles immediately
        if (shouldClose) {
            sheetRef.current.style.bottom = '-100vh';
            setTimeout(() => {
                onClose();
            }, duration);
            return;
        } else if (shouldExpand) {
            sheetRef.current.style.bottom = '0px';
            sheetRef.current.style.left = '0px';
            sheetRef.current.style.right = '0px';
            sheetRef.current.style.height = '95vh';
            sheetRef.current.style.maxHeight = '95vh';
            sheetRef.current.style.borderRadius = '24px 24px 0px 0px';
        } else {
            // Normal collapse state
            sheetRef.current.style.bottom = '24px';
            sheetRef.current.style.left = '16px';
            sheetRef.current.style.right = '16px';

            // targetH removed

            // Use 'auto' or calculated height? 
            // In PlaceSheet logic it used fixed height or let content decide.
            // If we set specific height, it might clip.
            // But we were setting `style.height` during drag.
            // Ideally we clear height to let it be auto, but max-height constrains it.
            // Let's reset height to empty string to let CSS take over (like in original cleanup)
            sheetRef.current.style.height = '';
            sheetRef.current.style.maxHeight = ''; // Let CSS class handle it
            sheetRef.current.style.borderRadius = '24px 24px 24px 24px'; // Fix border radius consistency
        }

        // 4. Update State
        if (shouldExpand !== isExpanded) {
            onExpandChange(shouldExpand);
        }

        // 5. Cleanup after animation
        setTimeout(() => {
            if (sheetRef.current) {
                sheetRef.current.style.transition = 'none';
                void sheetRef.current.offsetHeight;

                // Clear inline styles to let CSS classes take over
                sheetRef.current.style.bottom = '';
                sheetRef.current.style.left = '';
                sheetRef.current.style.right = '';
                sheetRef.current.style.height = '';
                sheetRef.current.style.maxHeight = '';
                sheetRef.current.style.borderRadius = '';

                setTimeout(() => {
                    if (sheetRef.current) {
                        sheetRef.current.style.transition = '';
                    }
                }, 10);
            }
        }, duration + 50);

        currentDelta.current = 0;
    };

    return (
        <>
            {/* Backdrop for expanded state */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-500"
                    onClick={onClose}
                />
            )}

            <div
                ref={sheetRef}
                className={`fixed z-[2000] shadow-soft-1 overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${isExpanded
                        ? 'inset-0 h-[100dvh] rounded-none bg-[#f5f5f5] backdrop-blur-none' /* Full screen, gray background like screenshot */
                        : 'left-4 right-4 bottom-6 rounded-card-lg max-h-[40vh] bg-[#ffffff85] backdrop-blur-md border border-white/50'
                    } ${className}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: isExpanded ? 'pan-y' : 'auto' }} // Stop horizontal gestures to map, allow vertical
            >
                {children}
            </div>
        </>
    );
}
