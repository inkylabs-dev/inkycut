import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { LocalFile, CompositionElement } from './types';
import { projectAtom, selectedPageAtom, removeFileAtom } from './atoms';
import { getFileIcon } from './LocalFileUpload';
import { getMediaDimensions, calculateElementDimensions, DEFAULT_DIMENSIONS, MediaDimensions } from './utils/mediaUtils';

interface FileListItemProps {
  file: LocalFile;
  onElementUpdate?: (elementId: string, updatedData: Partial<CompositionElement> | any) => void;
}

export default function FileListItem({ file }: FileListItemProps) {
  const [project, setProject] = useAtom(projectAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const removeFile = useSetAtom(removeFileAtom);
  const [isAddingToPage, setIsAddingToPage] = useState(false);

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFile(file.id);
  };

  const handleAddToPage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!selectedPage || !project) {
      console.warn('No page selected or project not available');
      return;
    }

    setIsAddingToPage(true);

    try {
      // Get default dimensions based on file type
      const defaultDims = file.type.startsWith('image/') 
        ? DEFAULT_DIMENSIONS.image 
        : file.type.startsWith('video/')
          ? DEFAULT_DIMENSIONS.video
          : DEFAULT_DIMENSIONS.image;
      
      let elementDimensions: MediaDimensions = { ...defaultDims };
      
      // Get actual dimensions and calculate optimal size
      const actualDimensions = await getMediaDimensions(file.dataUrl, file.type);
      if (actualDimensions) {
        elementDimensions = calculateElementDimensions(actualDimensions.width, actualDimensions.height);
      }

      const newElement: CompositionElement = {
        id: `element-${Date.now()}`,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        left: 100,
        top: 100,
        width: elementDimensions.width,
        height: elementDimensions.height,
        src: file.name, // Use filename as reference
        opacity: 1,
        zIndex: 1,
        rotation: 0,
        delay: 0,
      };
      
      // Add to the current page
      const updatedPage = {
        ...selectedPage,
        elements: [...selectedPage.elements, newElement]
      };
      
      // Update the project with the new element
      const updatedComposition = {
        ...project.composition,
        pages: project.composition.pages.map(page => 
          page.id === selectedPage.id ? updatedPage : page
        )
      };
      
      setProject({
        ...project,
        composition: updatedComposition
      });

      console.log(`Added ${file.name} to page with dimensions:`, elementDimensions);
    } catch (error) {
      console.error('Error adding file to page:', error);
    } finally {
      setIsAddingToPage(false);
    }
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
        </div>
      </div>
      <div className="flex space-x-1">
        <button
          onClick={handleAddToPage}
          disabled={isAddingToPage || !selectedPage}
          className={`opacity-0 group-hover:opacity-100 p-1 transition-opacity text-xs ${
            isAddingToPage 
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : selectedPage
                ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          title={selectedPage ? "Add to current page" : "Select a page first"}
        >
          {isAddingToPage ? '...' : '+'}
        </button>
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