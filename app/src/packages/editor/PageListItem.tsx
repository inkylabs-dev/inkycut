import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { CompositionPage } from '../composition/types';
import { filesAtom } from './atoms';
import PageThumbnail from './PageThumbnail';

// Helper function to format duration in HH:MM:SS format
function formatDuration(durationFrames: number, fps: number = 30): string {
  const totalSeconds = Math.floor(durationFrames / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface PageListItemProps {
  page: CompositionPage;
  fps: number;
  onDelete: () => void;
  onCopyId: () => void;
}

export default function PageListItem({
  page,
  fps,
  onDelete,
  onCopyId
}: PageListItemProps) {
  const [files] = useAtom(filesAtom);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyId();
    
    // Show feedback
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 1000);
  };

  return (
    <div className="relative">
      <div className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 group transition-all duration-200 ease-out">
        {/* Thumbnail */}
        <div className="mr-3 flex-shrink-0">
          <PageThumbnail 
            page={page} 
            files={files}
            width={80}
            height={45}
          />
        </div>
        
        {/* Page Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={page.name}>
            {page.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {formatDuration(page.duration, fps)} • ID: {page.id}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-1 ml-2">
          {/* Copy ID Button */}
          <button
            onClick={handleCopyId}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 transition-opacity relative"
            title="Copy page ID"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            {showCopyFeedback && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                Copied!
              </div>
            )}
          </button>
          
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-opacity"
            title="Delete page"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}