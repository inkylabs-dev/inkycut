import React, { useState } from 'react';
import { CompositionData, LocalFile } from '../../composition/types';
import PageThumbnail from './PageThumbnail';

interface PageTrackProps {
  compositionData: CompositionData;
  timelineZoom: number;
  getCurrentPage: () => { pageIndex: number; frameOffset: number };
  handlePageClick: (pageIndex: number, event: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (seconds: number) => string;
  files?: LocalFile[];
  onFileDropped?: (file: LocalFile, pageIndex: number) => void;
}

export default function PageTrack({
  compositionData,
  timelineZoom,
  getCurrentPage,
  handlePageClick,
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
        
        compositionData.pages.forEach((page, index) => {
          const pageDuration = page.duration / compositionData.fps; // Convert frames to seconds
          const isSelected = index === currentPageIndex;
          
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
            
            // Handle file drop from our drag system
            const fileId = e.dataTransfer.getData('text/plain');
            if (fileId && files) {
              const file = files.find(f => f.id === fileId);
              if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
                onFileDropped?.(file, index);
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
                dropTargetIndex === index
                  ? 'ring-2 ring-blue-400 ring-opacity-60 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30'
                  : ''
              }`}
              style={{
                left: `${leftPosition}px`,
                width: `${blockWidth}px`,
              }}
              onClick={(event) => handlePageClick(index, event)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title={`${page.name} (${formatTime(pageDuration)}) - Drop video/image files here`}
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
            </div>
          );
        });
        
        return elements;
      })()}
    </div>
  );
}