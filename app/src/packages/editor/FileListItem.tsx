import React, { useState, useRef } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { LocalFile } from './types';
import { removeFileAtom, replacingFilesAtom } from './atoms';
import { getFileIcon } from './LocalFileUpload';
// Using CSS transitions instead of animejs for simple animations

// Helper function to format duration in HH:MM:SS format
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface FileListItemProps {
  file: LocalFile;
  onDragStart?: (file: LocalFile) => void;
  onDragEnd?: () => void;
}

export default function FileListItem({ file, onDragStart, onDragEnd }: FileListItemProps) {
  const removeFile = useSetAtom(removeFileAtom);
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const replacingFiles = useAtomValue(replacingFilesAtom);
  const isBeingReplaced = replacingFiles[file.name] || false;

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFile(file.id);
  };

  const handleFileClick = () => {
    console.log('Local file selected:', file);
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Only allow dragging for video and image files
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Animate the original item to show it's being dragged
    if (itemRef.current) {
      itemRef.current.style.opacity = '0.5';
      itemRef.current.style.transform = 'scale(0.95)';
    }
    
    onDragStart?.(file);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Restore original item
    if (itemRef.current) {
      itemRef.current.style.opacity = '1';
      itemRef.current.style.transform = 'scale(1)';
    }
    
    onDragEnd?.();
  };

  return (
    <div className="relative">
      <div
        ref={itemRef}
        draggable={file.type.startsWith('video/') || file.type.startsWith('image/')}
        className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 group transition-all duration-200 ease-out ${
          (file.type.startsWith('video/') || file.type.startsWith('image/'))
            ? 'cursor-grab hover:border-blue-300 dark:hover:border-blue-500' 
            : 'cursor-pointer'
        } ${isDragging ? 'cursor-grabbing' : ''} ${
          isBeingReplaced ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
        onClick={handleFileClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title={
          file.type.startsWith('video/') 
            ? 'Drag to PageTrack to add video to page' 
            : file.type.startsWith('image/')
              ? 'Drag to PageTrack to add image to page'
              : file.name
        }
      >
        <div className="mr-3">
          <LocalFilePreviewItem file={file} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.name}>
            {isBeingReplaced ? 'Replacing ' + file.name + ' ...' : file.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {file.type} • {(file.size / 1024 / 1024).toFixed(1)}MB
            {(file.type.startsWith('video/') || file.type.startsWith('audio/')) && file.duration && (
              <> • {formatDuration(file.duration)}</>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          {isBeingReplaced ? (
            <ArrowPathIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />
          ) : (
            <button
              onClick={handleRemoveFile}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-opacity"
              title="Remove file"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Local file preview component (extracted from LeftPanel)
function LocalFilePreviewItem({ file }: { file: LocalFile }) {
  const [hasError, setHasError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (hasError || (!isImage && !isVideo)) {
    return getFileIcon(file.type, 'w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0');
  }

  if (isImage) {
    return (
      <img 
        src={file.dataUrl} 
        alt={file.name}
        className="w-8 h-8 object-cover rounded flex-shrink-0 border border-gray-200 dark:border-gray-600"
        onError={() => setHasError(true)}
      />
    );
  }

  if (isVideo) {
    return (
      <video 
        src={file.dataUrl}
        className="w-8 h-8 object-cover rounded flex-shrink-0 border border-gray-200 dark:border-gray-600"
        muted
        preload="metadata"
        onError={() => setHasError(true)}
      />
    );
  }

  // Fallback to document icon
  return getFileIcon(file.type, 'w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0');
}