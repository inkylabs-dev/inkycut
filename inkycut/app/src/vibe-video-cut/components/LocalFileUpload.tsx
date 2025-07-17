import React, { useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import { DocumentIcon, PhotoIcon, VideoCameraIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { addFileAtom } from '../atoms';
import { LocalFile } from '@inkycut/editor';

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
  accept = 'image/*,video/*',
  buttonText = 'Add Files'
}: LocalFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addFile = useSetAtom(addFileAtom);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 50MB.`);
        }

        // Add file to project
        const localFile = await addFile(file);
        if (localFile && onUploadComplete) {
          onUploadComplete(localFile);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      if (onUploadError) {
        onUploadError(error);
      }
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

    setIsUploading(true);

    try {
      for (const file of files) {
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 50MB.`);
        }

        // Add file to project
        const localFile = await addFile(file);
        if (localFile && onUploadComplete) {
          onUploadComplete(localFile);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setIsUploading(false);
    }
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
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
      >
        <div className="flex flex-col items-center space-y-2">
          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            <button
              onClick={handleButtonClick}
              disabled={isUploading}
              className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
            >
              {isUploading ? 'Adding files...' : buttonText}
            </button>
            <span> or drag and drop</span>
          </div>
          <div className="text-xs text-gray-500">
            Images, videos up to 50MB
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
  } else {
    return <DocumentIcon className={className} />;
  }
}