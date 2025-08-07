import React, { useState } from 'react';
import { XMarkIcon, DocumentDuplicateIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import { CompositionAudio } from '../composition/types';

// Helper function to format duration in HH:MM:SS format
function formatDuration(durationFrames: number, fps: number = 30): string {
  const totalSeconds = Math.floor(durationFrames / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to format volume as percentage
function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

// Helper function to get filename from src
function getFilename(src: string): string {
  try {
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return 'Audio file';
    }
    const url = new URL(src);
    const pathname = url.pathname;
    const filename = pathname.split('/').pop() || 'Audio file';
    return decodeURIComponent(filename);
  } catch {
    return 'Audio file';
  }
}

interface AudioListItemProps {
  audio: CompositionAudio;
  fps: number;
  onDelete: () => void;
  onCopyId: () => void;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function AudioListItem({
  audio,
  fps,
  onDelete,
  onCopyId,
  onClick,
  isSelected = false
}: AudioListItemProps) {
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

  const filename = getFilename(audio.src);

  return (
    <div className="relative">
      <div 
        className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border group transition-all duration-200 ease-out cursor-pointer ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.5)] dark:shadow-[0_0_0_3px_rgba(96,165,250,0.5)]' 
            : 'border-gray-200 dark:border-gray-600'
        }`}
        onClick={onClick}
      >
        {/* Audio Icon */}
        <div className="mr-3 flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
          {audio.muted ? (
            <SpeakerXMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          ) : (
            <SpeakerWaveIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          )}
        </div>
        
        {/* Audio Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={filename}>
            {filename}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {formatDuration(audio.duration, fps)} • Vol: {formatVolume(audio.volume)}{audio.muted ? ' • Muted' : ''}
            {audio.loop && ' • Loop'}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            ID: {audio.id}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-1 ml-2">
          {/* Copy ID Button */}
          <button
            onClick={handleCopyId}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 transition-opacity relative"
            title="Copy audio ID"
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
            title="Delete audio"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}