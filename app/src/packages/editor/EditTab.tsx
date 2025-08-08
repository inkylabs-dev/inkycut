import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  projectAtom, 
  selectedPageAtom, 
  selectedAudioAtom,
  addUserMessageToQueueAtom
} from './atoms';
import AudioEditPanel from './AudioEditPanel';
import Input from './components/Input';

export default function EditTab() {
  const [project] = useAtom(projectAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const [selectedAudio] = useAtom(selectedAudioAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  
  // Local state for page edit panel inputs
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editBackgroundColor, setEditBackgroundColor] = useState('');

  // Update page edit inputs when selected page changes
  useEffect(() => {
    if (selectedPage) {
      setEditName(selectedPage.name);
      const fps = project?.composition?.fps || 30;
      setEditDuration((selectedPage.duration / fps).toString());
      setEditBackgroundColor(selectedPage.backgroundColor || '#ffffff');
    }
  }, [selectedPage, project?.composition?.fps]);

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
    if (selectedPage && editName.trim() && editName !== selectedPage.name) {
      const command = `/set-page --id ${selectedPage.id} --name "${editName}"`;
      addUserMessageToQueue(command);
    }
  };

  const handleDurationBlur = () => {
    if (selectedPage && editDuration.trim()) {
      const duration = parseFloat(editDuration);
      const fps = project?.composition?.fps || 30;
      const currentDurationInSeconds = selectedPage.duration / fps;
      if (!isNaN(duration) && duration > 0 && duration !== currentDurationInSeconds) {
        const command = `/set-page --id ${selectedPage.id} --duration ${duration}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleBackgroundColorBlur = () => {
    if (selectedPage && editBackgroundColor !== selectedPage.backgroundColor) {
      const command = `/set-page --id ${selectedPage.id} --background "${editBackgroundColor}"`;
      addUserMessageToQueue(command);
    }
  };

  if (selectedAudio) {
    // Show audio edit panel if an audio is selected
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Edit Audio
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Editing: {selectedAudio.name || selectedAudio.id}
          </p>
        </div>
        <AudioEditPanel audio={selectedAudio} />
      </div>
    );
  }

  if (selectedPage) {
    // Show page edit panel if a page is selected
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Edit Page
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Editing: {selectedPage.name}
          </p>
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

  // No selection - show helpful message
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
        Select an Object to Edit
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
        Select a page from the Pages tab or an audio from the Audios tab to see editing options here.
      </p>
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <div>• Pages: Edit name, duration, and background color</div>
        <div>• Audios: Edit volume, timing, and playback settings</div>
      </div>
    </div>
  );
}