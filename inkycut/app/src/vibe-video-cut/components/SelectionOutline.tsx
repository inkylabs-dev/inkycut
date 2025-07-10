import React, {useCallback, useMemo} from 'react';
import {useCurrentScale} from 'remotion';

import {ResizeHandle} from './ResizeHandle';
import type {CompositionElement} from './types';

export const SelectionOutline: React.FC<{
    compositionElement: CompositionElement;
    changeCompositionElement: (elementId: string, updater: (element: CompositionElement) => CompositionElement) => void;
    setSelectedElement: (elementId: string | null) => void;
    selectedElement: string | null;
    isDragging: boolean;
}> = ({compositionElement, changeCompositionElement, setSelectedElement, selectedElement, isDragging}) => {
    const scale = useCurrentScale();
    const scaledBorder = Math.ceil(2 / scale);

    const [hovered, setHovered] = React.useState(false);

    const onMouseEnter = useCallback(() => {
        setHovered(true);
    }, []);

    const onMouseLeave = useCallback(() => {
        setHovered(false);
    }, []);

    const isSelected = compositionElement.id === selectedElement;

    const style: React.CSSProperties = useMemo(() => {
        return {
            width: compositionElement.width ?? 100,
            height: compositionElement.height ?? 100,
            left: compositionElement.left,
            top: compositionElement.top,
            position: 'absolute',
            outline: isSelected 
            ? `${scaledBorder * 2}px solid #FF3366` 
            : (hovered && !isDragging)
              ? `${scaledBorder}px solid #0B84F3`
              : undefined,
            boxShadow: isSelected ? '0 0 0 2px rgba(255, 51, 102, 0.5)' : undefined,
            backgroundColor: isSelected ? 'rgba(255, 51, 102, 0.1)' : undefined,
            userSelect: 'none',
            touchAction: 'none',
            pointerEvents: 'all', // Ensure we can interact with this element
            zIndex: isSelected ? 1000 : undefined, // Bring selected elements to front
        };
    }, [compositionElement, hovered, isDragging, isSelected, scaledBorder]);

    const startDragging = useCallback(
        (e: PointerEvent | React.MouseEvent) => {
            const initialX = e.clientX;
            const initialY = e.clientY;

            const onPointerMove = (pointerMoveEvent: PointerEvent) => {
                const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
                const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
                changeCompositionElement(compositionElement.id, (el) => {
                    return {
                        ...el,
                        left: Math.round(compositionElement.left + offsetX),
                        top: Math.round(compositionElement.top + offsetY),
                        isDragging: true,
                    };
                });
            };

            const onPointerUp = () => {
                changeCompositionElement(compositionElement.id, (el) => {
                    return {
                        ...el,
                        isDragging: false,
                    };
                });
                window.removeEventListener('pointermove', onPointerMove);
            };

            window.addEventListener('pointermove', onPointerMove, {passive: true});

            window.addEventListener('pointerup', onPointerUp, {
                once: true,
            });
        },
        [compositionElement, scale, changeCompositionElement],
    );

    const onPointerDown = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (e.button !== 0) {
                return;
            }

            setSelectedElement(compositionElement.id);
            startDragging(e);
        },
        [compositionElement.id, setSelectedElement, startDragging],
    );

    // console.log("SelectionOutline rendering for element:", {
    //     id: compositionElement.id,
    //     isSelected,
    //     isDragging,
    //     hovered,
    //     left: compositionElement.left,
    //     top: compositionElement.top,
    //     width: compositionElement.width,
    //     height: compositionElement.height
    // });

    return (
        <div
            className="selection-outline"
            onPointerDown={onPointerDown}
            onPointerEnter={onMouseEnter}
            onPointerLeave={onMouseLeave}
            style={style}
        >
            {isSelected ? (
                <>
                    <ResizeHandle item={compositionElement} setItem={changeCompositionElement} type="top-left" />
                    <ResizeHandle item={compositionElement} setItem={changeCompositionElement} type="top-right" />
                    <ResizeHandle item={compositionElement} setItem={changeCompositionElement} type="bottom-left" />
                    <ResizeHandle item={compositionElement} setItem={changeCompositionElement} type="bottom-right" />
                </>
            ) : null}
        </div>
    );
};