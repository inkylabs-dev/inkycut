import React, { useState, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { projectAtom, setSelectedElementAtom, setSelectedPageAtom, chatMessagesAtom } from './atoms';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setProject = useSetAtom(projectAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  const setChatMessages = useSetAtom(chatMessagesAtom);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/json') {
      setError('Please select a valid JSON file');
      return;
    }

    setIsImporting(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const projectData = JSON.parse(content);
        
        // Validate basic project structure
        if (!projectData || typeof projectData !== 'object') {
          throw new Error('Invalid project format');
        }

        // Import the project
        console.log('Importing project:', projectData);
        setProject(projectData);
        
        // Set selected page to first page if available
        if (projectData.composition?.pages?.length > 0) {
          setSelectedPage(projectData.composition.pages[0]);
        }
        
        // Clear selected element
        setSelectedElement(null);
        
        // Reset chat messages
        setChatMessages([
          {
            id: 1,
            role: 'assistant',
            content: 'Project imported successfully! I\'m ready to help you edit your imported project.',
            timestamp: new Date().toISOString()
          }
        ]);
        
        onClose();
      } catch (err) {
        setError('Failed to import project. Please check if the file contains valid project data.');
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      setError('Failed to read the file');
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleChooseFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Import Project</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleDropAreaClick}
          >
            <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isImporting ? 'Importing...' : 'Select JSON file to import'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop a project JSON file here, or click to browse
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              disabled={isImporting}
            />
            
            <button
              onClick={handleChooseFile}
              disabled={isImporting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose File
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <p>⚠️ Importing will replace your current project. Make sure to export your current work first if needed.</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}