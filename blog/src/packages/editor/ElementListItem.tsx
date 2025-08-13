import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { XMarkIcon, DocumentDuplicateIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { CompositionElement } from '../composition/types';
import { filesAtom, activeTabAtom, editContextAtom } from './atoms';
import ElementPreview from './ElementPreview';
import { createFileResolver } from '../composition/utils/fileResolver';

interface ElementListItemProps {
  element: CompositionElement;
  onDelete: () => void;
  onCopyId: () => void;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function ElementListItem({
  element,
  onDelete,
  onCopyId,
  onClick,
  isSelected = false
}: ElementListItemProps) {
  const [files] = useAtom(filesAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const setEditContext = useSetAtom(editContextAtom);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Create file resolver from local files
  const fileResolver = React.useMemo(() => {
    return createFileResolver(files);
  }, [files]);

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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Set the edit context for this element
    setEditContext({
      type: 'element',
      id: element.id
    });
    
    // Switch to Edit tab
    setActiveTab('edit');
  };

  // Get element display name
  const getElementDisplayName = () => {
    if (element.type === 'text') {
      return element.text ? 
        (element.text.length > 20 ? `${element.text.substring(0, 20)}...` : element.text) 
        : 'Text Element';
    } else {
      return element.src ? 
        element.src.split('/').pop() || `${element.type} Element` 
        : `${element.type} Element`;
    }
  };

  return (
    <div className="relative">
      <div 
        className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border group transition-all duration-200 ease-out cursor-pointer ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
            : 'border-gray-200 dark:border-gray-600'
        }`}
        onClick={onClick}
      >
        {/* Element Preview */}
        <div className="mr-3 flex-shrink-0">
          <ElementPreview 
            element={element} 
            className="w-12 h-12" 
            fileResolver={fileResolver} 
          />
        </div>
        
        {/* Element Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={getElementDisplayName()}>
            {getElementDisplayName()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
            <span className="mr-2 capitalize">{element.type}</span>
            {element.delay !== undefined && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded mr-2">
                delay: {element.delay}ms
              </span>
            )}
            <span>ID: {element.id}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-1 ml-2">
          {/* Edit Button */}
          <button
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 p-1 transition-opacity"
            title="Edit element"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          
          {/* Copy ID Button */}
          <button
            onClick={handleCopyId}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 transition-opacity relative"
            title="Copy element ID"
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
            title="Delete element"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}