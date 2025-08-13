import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import type { LocalFile } from '../composition/types';
import { filesAtom, draggedFileIdAtom } from './atoms';
import LocalFileUpload from './LocalFileUpload';
import FileListItem from './FileListItem';

interface FileTabProps {
  disableFileUpload?: boolean;
}

export default function FileTab({ disableFileUpload = false }: FileTabProps) {
  const [localFiles] = useAtom(filesAtom);
  const setDraggedFileId = useSetAtom(draggedFileIdAtom);
  
  const handleFileDragStart = (file: LocalFile) => {
    // Store only the file ID in transient state to avoid localStorage quota issues
    setDraggedFileId(file.id);
  };
  
  const handleFileDragEnd = () => {
    // Clear dragged file ID from transient state
    setDraggedFileId(null);
  };

  const handleUploadComplete = () => {
    // File upload completed successfully
  };

  const handleUploadError = () => {
    // Handle upload error
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Project Assets</h3>
      </div>
      
      {/* File Upload Section - disabled based on prop */}
      {!disableFileUpload && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Add Local Files</h4>
          <LocalFileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            buttonText="Add to Project"
            className="mb-4"
          />
        </div>
      )}
      
      {/* Local Files Section */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Project Files</h4>
        <div className="space-y-2">
          {localFiles.length > 0 ? (
            localFiles.map((file: LocalFile) => (
              <FileListItem
                key={file.id}
                file={file}
                onDragStart={handleFileDragStart}
                onDragEnd={handleFileDragEnd}
              />
            ))
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No files added yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
