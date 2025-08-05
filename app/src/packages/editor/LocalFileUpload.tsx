import React, { useRef, useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { DocumentIcon, PhotoIcon, VideoCameraIcon, MusicalNoteIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { addFileAtom, filesAtom, setReplacingFilesAtom } from './atoms';
import { LocalFile } from '../composition/types';

interface LocalFileUploadProps {
  onUploadComplete?: (file: LocalFile) => void;
  onUploadError?: (error: any) => void;
  className?: string;
  accept?: string;
  buttonText?: string;
}

export default function LocalFileUpload({
  onUploadComplete,
  onUploadError,
  className = '',
  accept = 'image/*,video/*,audio/*',
  buttonText = 'Add Files'
}: LocalFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addFile = useSetAtom(addFileAtom);
  const existingFiles = useAtomValue(filesAtom);
  const setReplacingFiles = useSetAtom(setReplacingFilesAtom);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);

    try {
      // Check for replacements and mark them in the atom
      const replacingFiles: Record<string, boolean> = {};
      for (const file of files) {
        const existingFile = existingFiles.find(f => f.name === file.name);
        if (existingFile) {
          replacingFiles[file.name] = true;
        }
      }

      // Update the replacing files atom to show hints in file list
      setReplacingFiles(replacingFiles);

      for (const file of files) {
        // Add file to project
        const localFile = await addFile(file);
        if (localFile && onUploadComplete) {
          onUploadComplete(localFile);
        }
      }
      
      // Clear replacement indicators after a delay
      setTimeout(() => {
        setReplacingFiles({});
      }, 2000);
    } catch (error) {
      console.error('Error uploading file:', error);
      if (onUploadError) {
        onUploadError(error);
      }
      // Clear replacement indicators on error
      setReplacingFiles({});
    } finally {
      setIsUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <div className="flex flex-col items-center space-y-2">
          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <button
              onClick={handleButtonClick}
              disabled={isUploading}
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium disabled:opacity-50"
            >
              {isUploading ? 'Adding files...' : buttonText}
            </button>
            <span> or drag and drop</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Images, videos and audio are supported
          </div>
        </div>
      </div>
    </div>
  );
}

export function getFileIcon(type: string, className: string = 'w-6 h-6') {
  if (type.startsWith('image/')) {
    return <PhotoIcon className={className} />;
  } else if (type.startsWith('video/')) {
    return <VideoCameraIcon className={className} />;
  } else if (type.startsWith('audio/')) {
    return <MusicalNoteIcon className={className} />;
  } else {
    return <DocumentIcon className={className} />;
  }
}