import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { LocalFile } from './types';
import { removeFileAtom } from './atoms';
import { getFileIcon } from './LocalFileUpload';

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
}

export default function FileListItem({ file }: FileListItemProps) {
  const removeFile = useSetAtom(removeFileAtom);
  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFile(file.id);
  };

  const handleFileClick = () => {
    console.log('Local file selected:', file);
  };

  return (
    <div
      className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer border border-gray-200 dark:border-gray-600 group"
      onClick={handleFileClick}
    >
      <div className="mr-3">
        <LocalFilePreviewItem file={file} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {file.type} • {(file.size / 1024 / 1024).toFixed(1)}MB
          {file.type.startsWith('video/') && file.duration && (
            <> • {formatDuration(file.duration)}</>
          )}
        </div>
      </div>
      <div className="flex space-x-1">
        <button
          onClick={handleRemoveFile}
          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-opacity"
          title="Remove file"
        >
          ×
        </button>
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