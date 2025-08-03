import React, { useState } from 'react';
import { CompositionData, LocalFile } from '../types';
import PageThumbnail from './PageThumbnail';

interface PageTrackProps {
  compositionData: CompositionData;
  timelineZoom: number;
  getCurrentPage: () => { pageIndex: number; frameOffset: number };
  handlePageClick: (pageIndex: number, event: React.MouseEvent<HTMLDivElement>) => void;
  handlePageMouseDown: (event: React.MouseEvent, pageIndex: number) => void;
  isPageDragging: boolean;
  draggedPageIndex: number | null;
  dropIndicatorIndex: number | null;
  isResizing: boolean;
  resizingPageIndex: number | null;
  setIsResizing: (value: boolean) => void;
  setResizingPageIndex: (value: number | null) => void;
  setStartResizeWidth: (value: number) => void;
  setStartMouseX: (value: number) => void;
  formatTime: (seconds: number) => string;
  files?: LocalFile[];
  onFileDropped?: (file: LocalFile, pageIndex: number) => void;
}

export default function PageTrack({
  compositionData,
  timelineZoom,
  getCurrentPage,
  handlePageClick,
  handlePageMouseDown,
  isPageDragging,
  draggedPageIndex,
  dropIndicatorIndex,
  isResizing,
  resizingPageIndex,
  setIsResizing,
  setResizingPageIndex,
  setStartResizeWidth,
  setStartMouseX,
  formatTime,
  files,
  onFileDropped
}: PageTrackProps) {
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  return (
    <div className="pages-track relative h-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" style={{ width: '100%' }}>
      {(() => {
        let cumulativePosition = 0;
        const currentPageIndex = getCurrentPage().pageIndex;
        const elements: React.ReactElement[] = [];
        
        // Add drop indicator at the beginning if needed (before first page)
        if (isPageDragging && dropIndicatorIndex === 0) {
          elements.push(
            <div
              key="drop-indicator-start"
              className="absolute top-0 bottom-0 w-1 bg-blue-500 z-40 shadow-lg opacity-90"
              style={{
                left: '0px',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                animation: 'pulse 1.2s infinite'
              }}
            />
          );
        }
        
        compositionData.pages.forEach((page, index) => {
          const pageDuration = page.duration / 1000;
          const isSelected = index === currentPageIndex;
          const isDraggedPage = draggedPageIndex === index;
          
          // Calculate width in pixels - 100px per second at 100% zoom
          const blockWidth = Math.max(pageDuration * 100 * timelineZoom, 80);
          const blockHeight = 56; // Height minus top/bottom margins (64px - 8px = 56px)
          const leftPosition = cumulativePosition;
          
          // Always update cumulative position to maintain layout space
          cumulativePosition += blockWidth;
          
          const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            setDropTargetIndex(index);
          };
          
          const handleDragLeave = (e: React.DragEvent) => {
            // Only clear if we're actually leaving the page (not just entering a child)
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTargetIndex(null);
            }
          };
          
          const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            setDropTargetIndex(null);
            
            // Handle file drop from external sources or our drag system
            const fileData = e.dataTransfer.getData('application/json');
            if (fileData) {
              try {
                const file = JSON.parse(fileData) as LocalFile;
                // Accept both video and image files
                if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
                  onFileDropped?.(file, index);
                }
              } catch (error) {
                console.error('Failed to parse dropped file data:', error);
              }
            }
          };

          elements.push(
            <div
              key={`page-${page.id}`}
              className={`absolute top-1 bottom-1 rounded overflow-hidden border-2 transition-all ${
                isSelected 
                  ? 'border-blue-400 shadow-lg z-20' 
                  : 'border-gray-300 dark:border-gray-600'
              } ${
                isDraggedPage 
                  ? 'cursor-grabbing opacity-75 scale-105 z-30 shadow-2xl' 
                  : isPageDragging 
                    ? 'cursor-default' 
                    : 'cursor-grab hover:opacity-80'
              } ${
                dropTargetIndex === index
                  ? 'ring-2 ring-blue-400 ring-opacity-60 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30'
                  : ''
              }`}
              style={{
                left: `${leftPosition}px`,
                width: `${blockWidth}px`,
                transform: isDraggedPage ? 'rotate(2deg)' : 'none',
              }}
              onClick={(event) => !isPageDragging && !isResizing && handlePageClick(index, event)}
              onMouseDown={(event) => handlePageMouseDown(event, index)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title={`${page.name} (${formatTime(pageDuration)}) - Drag to reorder, drag right edge to resize, or drop video/image files here`}
            >
              <PageThumbnail
                page={page}
                pageIndex={index}
                compositionData={compositionData}
                width={blockWidth}
                height={blockHeight}
                files={files}
                className="w-full h-full"
              />
              {/* Resize handle */}
              <div 
                className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-20 transition-colors z-10 ${
                  resizingPageIndex === index ? 'bg-black bg-opacity-30' : ''
                }`}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  setIsResizing(true);
                  setResizingPageIndex(index);
                  setStartResizeWidth(blockWidth);
                  setStartMouseX(event.clientX);
                }}
                title="Drag to resize duration"
              />
            </div>
          );
          
          // Add drop indicator after this page if needed
          // Convert dropIndicatorIndex (in visual space without dragged page) to actual page index
          let showIndicatorAfterThisPage = false;
          
          if (isPageDragging && !isDraggedPage) {
            // Calculate visual index for this page (how many non-dragged pages come before it)
            let visualIndex = 0;
            for (let i = 0; i < index; i++) {
              if (i !== draggedPageIndex) {
                visualIndex++;
              }
            }
            
            // Show indicator after this page if dropIndicatorIndex matches
            showIndicatorAfterThisPage = dropIndicatorIndex === visualIndex + 1;
          }
          
          if (showIndicatorAfterThisPage) {
            elements.push(
              <div
                key={`drop-indicator-${index + 1}`}
                className="absolute top-0 bottom-0 w-1 bg-blue-500 z-40 shadow-lg opacity-90"
                style={{
                  left: `${cumulativePosition}px`,
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                  animation: 'pulse 1.2s infinite'
                }}
              />
            );
          }
        });
        
        return elements;
      })()}
    </div>
  );
}