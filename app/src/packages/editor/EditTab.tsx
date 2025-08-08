import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  projectAtom, 
  editContextAtom,
  activeTabAtom,
  addUserMessageToQueueAtom
} from './atoms';
import AudioEditPanel from './AudioEditPanel';
import Input from './components/Input';

export default function EditTab() {
  const [project] = useAtom(projectAtom);
  const [editContext, setEditContext] = useAtom(editContextAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  
  // Find the current page or audio being edited
  const currentPage = editContext?.type === 'page' ? 
    project?.composition?.pages.find(p => p.id === editContext.id) : null;
  const currentAudio = editContext?.type === 'audio' ? 
    project?.composition?.audios?.find(a => a.id === editContext.id) : null;
    
  // Handle closing edit mode
  const handleCloseEdit = () => {
    setEditContext(null);
    setActiveTab('files');
  };
  
  // If the item being edited no longer exists, close the edit mode
  useEffect(() => {
    if (editContext && !currentPage && !currentAudio) {
      setEditContext(null);
      setActiveTab('files');
    }
  }, [editContext, currentPage, currentAudio, setEditContext, setActiveTab]);
  
  // Local state for page edit panel inputs
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editBackgroundColor, setEditBackgroundColor] = useState('');

  // Update page edit inputs when current page changes
  useEffect(() => {
    if (currentPage) {
      setEditName(currentPage.name);
      const fps = project?.composition?.fps || 30;
      setEditDuration((currentPage.duration / fps).toString());
      setEditBackgroundColor(currentPage.backgroundColor || '#ffffff');
    }
  }, [currentPage, project?.composition?.fps]);

  // Page edit handlers
  const handleNameChange = (newName: string) => {
    setEditName(newName);
  };

  const handleDurationChange = (newDuration: string) => {
    setEditDuration(newDuration);
  };

  const handleBackgroundColorChange = (newBackgroundColor: string) => {
    setEditBackgroundColor(newBackgroundColor);
  };

  const handleNameBlur = () => {
    if (currentPage && editName.trim() && editName !== currentPage.name) {
      const command = `/set-page --id ${currentPage.id} --name "${editName}"`;
      addUserMessageToQueue(command);
    }
  };

  const handleDurationBlur = () => {
    if (currentPage && editDuration.trim()) {
      const duration = parseFloat(editDuration);
      const fps = project?.composition?.fps || 30;
      const currentDurationInSeconds = currentPage.duration / fps;
      if (!isNaN(duration) && duration > 0 && duration !== currentDurationInSeconds) {
        const command = `/set-page --id ${currentPage.id} --duration ${duration}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleBackgroundColorBlur = () => {
    if (currentPage && editBackgroundColor !== currentPage.backgroundColor) {
      const command = `/set-page --id ${currentPage.id} --background "${editBackgroundColor}"`;
      addUserMessageToQueue(command);
    }
  };

  if (currentAudio) {
    // Show audio edit panel if an audio is being edited
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Edit Audio
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Editing: {currentAudio.src.split('/').pop()?.split('?')[0] || currentAudio.id}
            </p>
          </div>
          <button
            onClick={handleCloseEdit}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
            title="Close edit panel"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <AudioEditPanel audio={currentAudio} />
      </div>
    );
  }

  if (currentPage) {
    // Show page edit panel if a page is being edited
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Edit Page
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Editing: {currentPage.name}
            </p>
          </div>
          <button
            onClick={handleCloseEdit}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
            title="Close edit panel"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            {/* Name Input */}
            <Input
              label="Name"
              value={editName}
              type="text"
              placeholder="Enter page name"
              onChange={handleNameChange}
              onBlur={handleNameBlur}
            />

            {/* Duration Input */}
            <Input
              label="Duration"
              value={editDuration}
              type="number"
              placeholder="0.0"
              unit="seconds"
              step={0.1}
              min={0.1}
              onChange={handleDurationChange}
              onBlur={handleDurationBlur}
            />

            {/* Background Color Input */}
            <Input
              label="Background"
              value={editBackgroundColor}
              type="color"
              placeholder="#000000"
              onChange={handleBackgroundColorChange}
              onBlur={handleBackgroundColorBlur}
            />
          </div>
        </div>
      </div>
    );
  }

  // No edit context - this should not be shown as the Edit tab is conditional
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="mb-4">
        <svg 
          className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Click an Edit Icon
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
        Click the edit icon on a page or audio item to start editing. This tab only appears when editing is active.
      </p>
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <div>• Pages: Edit name, duration, and background color</div>
        <div>• Audios: Edit volume, timing, and playback settings</div>
      </div>
    </div>
  );
}