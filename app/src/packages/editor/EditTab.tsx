import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  projectAtom, 
  editContextAtom,
  activeTabAtom,
  addUserMessageToQueueAtom
} from './atoms';
import { CompositionElement } from '../composition/types';
import AudioEditPanel from './AudioEditPanel';
import Input from './components/Input';

export default function EditTab() {
  const [project] = useAtom(projectAtom);
  const [editContext, setEditContext] = useAtom(editContextAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  
  // Find the current page, audio, or element being edited
  const currentPage = editContext?.type === 'page' ? 
    project?.composition?.pages.find(p => p.id === editContext.id) : null;
  const currentAudio = editContext?.type === 'audio' ? 
    project?.composition?.audios?.find(a => a.id === editContext.id) : null;
    
  // Find current element being edited
  let currentElement: CompositionElement | null = null;
  if (editContext?.type === 'element') {
    for (const page of project?.composition?.pages || []) {
      const element = page.elements.find(el => el.id === editContext.id);
      if (element) {
        currentElement = element;
        break;
      }
    }
  }
    
  // Handle closing edit mode
  const handleCloseEdit = () => {
    setEditContext(null);
    setActiveTab('files');
  };
  
  // If the item being edited no longer exists, close the edit mode
  useEffect(() => {
    if (editContext && !currentPage && !currentAudio && !currentElement) {
      setEditContext(null);
      setActiveTab('files');
    }
  }, [editContext, currentPage, currentAudio, currentElement, setEditContext, setActiveTab]);
  
  // Local state for page edit panel inputs
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editBackgroundColor, setEditBackgroundColor] = useState('');

  // Local state for element edit panel inputs
  const [editElementText, setEditElementText] = useState('');
  const [editElementLeft, setEditElementLeft] = useState('');
  const [editElementTop, setEditElementTop] = useState('');
  const [editElementWidth, setEditElementWidth] = useState('');
  const [editElementHeight, setEditElementHeight] = useState('');
  const [editElementFontSize, setEditElementFontSize] = useState('');
  const [editElementColor, setEditElementColor] = useState('');
  const [editElementDelay, setEditElementDelay] = useState('');
  const [editElementOpacity, setEditElementOpacity] = useState('');
  const [editElementRotation, setEditElementRotation] = useState('');

  // Update page edit inputs when current page changes
  useEffect(() => {
    if (currentPage) {
      setEditName(currentPage.name);
      const fps = project?.composition?.fps || 30;
      setEditDuration((currentPage.duration / fps).toString());
      setEditBackgroundColor(currentPage.backgroundColor || '#ffffff');
    }
  }, [currentPage, project?.composition?.fps]);

  // Update element edit inputs when current element changes
  useEffect(() => {
    if (currentElement) {
      setEditElementText(currentElement.text || '');
      setEditElementLeft(currentElement.left?.toString() || '');
      setEditElementTop(currentElement.top?.toString() || '');
      setEditElementWidth(currentElement.width?.toString() || '');
      setEditElementHeight(currentElement.height?.toString() || '');
      setEditElementFontSize(currentElement.fontSize?.toString() || '');
      setEditElementColor(currentElement.color || '#000000');
      setEditElementDelay(currentElement.delay?.toString() || '');
      setEditElementOpacity(currentElement.opacity?.toString() || '1');
      setEditElementRotation(currentElement.rotation?.toString() || '0');
    }
  }, [currentElement]);

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

  // Element edit handlers
  const handleElementTextChange = (newText: string) => {
    setEditElementText(newText);
  };

  const handleElementTextBlur = () => {
    if (currentElement && currentElement.type === 'text' && editElementText !== (currentElement.text || '')) {
      const command = `/set-text --id ${currentElement.id} --text "${editElementText}"`;
      addUserMessageToQueue(command);
    }
  };

  const handleElementPositionChange = (field: 'left' | 'top' | 'width' | 'height', value: string) => {
    switch (field) {
      case 'left':
        setEditElementLeft(value);
        break;
      case 'top':
        setEditElementTop(value);
        break;
      case 'width':
        setEditElementWidth(value);
        break;
      case 'height':
        setEditElementHeight(value);
        break;
    }
  };

  const handleElementPositionBlur = (field: 'left' | 'top' | 'width' | 'height') => {
    if (!currentElement) return;

    const getValue = () => {
      switch (field) {
        case 'left': return editElementLeft;
        case 'top': return editElementTop;
        case 'width': return editElementWidth;
        case 'height': return editElementHeight;
      }
    };

    const value = parseFloat(getValue());
    const currentValue = currentElement[field] || 0;
    
    if (!isNaN(value) && value >= 0 && value !== currentValue) {
      let command = '';
      switch (currentElement.type) {
        case 'text':
          command = `/set-text --id ${currentElement.id} --${field} ${value}`;
          break;
        case 'image':
          command = `/set-image --id ${currentElement.id} --${field} ${value}`;
          break;
        case 'video':
          command = `/set-video --id ${currentElement.id} --${field} ${value}`;
          break;
        default:
          return;
      }
      addUserMessageToQueue(command);
    }
  };

  const handleElementFontSizeChange = (value: string) => {
    setEditElementFontSize(value);
  };

  const handleElementFontSizeBlur = () => {
    if (currentElement && currentElement.type === 'text' && editElementFontSize) {
      const fontSize = parseFloat(editElementFontSize);
      if (!isNaN(fontSize) && fontSize > 0 && fontSize !== (currentElement.fontSize || 0)) {
        const command = `/set-text --id ${currentElement.id} --font-size ${fontSize}`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleElementColorChange = (color: string) => {
    setEditElementColor(color);
  };

  const handleElementColorBlur = () => {
    if (currentElement && currentElement.type === 'text' && editElementColor !== (currentElement.color || '#000000')) {
      const command = `/set-text --id ${currentElement.id} --color "${editElementColor}"`;
      addUserMessageToQueue(command);
    }
  };

  const handleElementDelayChange = (value: string) => {
    setEditElementDelay(value);
  };

  const handleElementDelayBlur = () => {
    if (currentElement && editElementDelay) {
      const delay = parseFloat(editElementDelay);
      if (!isNaN(delay) && delay >= 0 && delay !== (currentElement.delay || 0)) {
        let command = '';
        switch (currentElement.type) {
          case 'text':
            command = `/set-text --id ${currentElement.id} --delay ${delay}`;
            break;
          case 'image':
            command = `/set-image --id ${currentElement.id} --delay ${delay}`;
            break;
          case 'video':
            command = `/set-video --id ${currentElement.id} --delay ${delay}`;
            break;
          default:
            return;
        }
        addUserMessageToQueue(command);
      }
    }
  };

  const handleElementOpacityChange = (value: string) => {
    setEditElementOpacity(value);
  };

  const handleElementOpacityBlur = () => {
    if (currentElement && editElementOpacity) {
      const opacity = parseFloat(editElementOpacity);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1 && opacity !== (currentElement.opacity || 1)) {
        let command = '';
        switch (currentElement.type) {
          case 'text':
            command = `/set-text --id ${currentElement.id} --opacity ${opacity}`;
            break;
          case 'image':
            command = `/set-image --id ${currentElement.id} --opacity ${opacity}`;
            break;
          case 'video':
            command = `/set-video --id ${currentElement.id} --opacity ${opacity}`;
            break;
          default:
            return;
        }
        addUserMessageToQueue(command);
      }
    }
  };

  const handleElementRotationChange = (value: string) => {
    setEditElementRotation(value);
  };

  const handleElementRotationBlur = () => {
    if (currentElement && editElementRotation) {
      const rotation = parseFloat(editElementRotation);
      if (!isNaN(rotation) && rotation !== (currentElement.rotation || 0)) {
        let command = '';
        switch (currentElement.type) {
          case 'text':
            command = `/set-text --id ${currentElement.id} --rotation ${rotation}`;
            break;
          case 'image':
            command = `/set-image --id ${currentElement.id} --rotation ${rotation}`;
            break;
          case 'video':
            command = `/set-video --id ${currentElement.id} --rotation ${rotation}`;
            break;
          default:
            return;
        }
        addUserMessageToQueue(command);
      }
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
        
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
          <div className="p-6 space-y-6">
            {/* Page Properties */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Page Properties</h4>
              <div className="space-y-4">
                <Input
                  label="Page Name"
                  value={editName}
                  type="text"
                  placeholder="Enter page name"
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                />
                <Input
                  label="Duration"
                  value={editDuration}
                  type="number"
                  placeholder="5.0"
                  unit="seconds"
                  step={0.1}
                  min={0.1}
                  onChange={handleDurationChange}
                  onBlur={handleDurationBlur}
                />
                <Input
                  label="Background Color"
                  value={editBackgroundColor}
                  type="color"
                  placeholder="#ffffff"
                  onChange={handleBackgroundColorChange}
                  onBlur={handleBackgroundColorBlur}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentElement) {
    // Show element edit panel if an element is being edited
    const getElementDisplayName = () => {
      if (currentElement.type === 'text') {
        return currentElement.text ? 
          (currentElement.text.length > 30 ? `${currentElement.text.substring(0, 30)}...` : currentElement.text) 
          : 'Text Element';
      } else {
        return currentElement.src ? 
          currentElement.src.split('/').pop() || `${currentElement.type} Element` 
          : `${currentElement.type} Element`;
      }
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Edit Element
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Editing: {getElementDisplayName()} ({currentElement.type})
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
        
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
          <div className="p-6 space-y-6">
            {/* Text Properties - only for text elements */}
            {currentElement.type === 'text' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Text Properties</h4>
                  <div className="space-y-4">
                    <Input
                      label="Text Content"
                      value={editElementText}
                      type="text"
                      placeholder="Enter text content"
                      onChange={handleElementTextChange}
                      onBlur={handleElementTextBlur}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Font Size"
                        value={editElementFontSize}
                        type="number"
                        placeholder="24"
                        unit="px"
                        step={1}
                        min={1}
                        onChange={handleElementFontSizeChange}
                        onBlur={handleElementFontSizeBlur}
                      />
                      <Input
                        label="Text Color"
                        value={editElementColor}
                        type="color"
                        placeholder="#000000"
                        onChange={handleElementColorChange}
                        onBlur={handleElementColorBlur}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Position & Size */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Position & Size</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="X Position"
                    value={editElementLeft}
                    type="number"
                    placeholder="0"
                    unit="px"
                    step={1}
                    min={0}
                    onChange={(value) => handleElementPositionChange('left', value)}
                    onBlur={() => handleElementPositionBlur('left')}
                  />
                  <Input
                    label="Y Position"
                    value={editElementTop}
                    type="number"
                    placeholder="0"
                    unit="px"
                    step={1}
                    min={0}
                    onChange={(value) => handleElementPositionChange('top', value)}
                    onBlur={() => handleElementPositionBlur('top')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Width"
                    value={editElementWidth}
                    type="number"
                    placeholder="100"
                    unit="px"
                    step={1}
                    min={1}
                    onChange={(value) => handleElementPositionChange('width', value)}
                    onBlur={() => handleElementPositionBlur('width')}
                  />
                  <Input
                    label="Height"
                    value={editElementHeight}
                    type="number"
                    placeholder="100"
                    unit="px"
                    step={1}
                    min={1}
                    onChange={(value) => handleElementPositionChange('height', value)}
                    onBlur={() => handleElementPositionBlur('height')}
                  />
                </div>
              </div>
            </div>

            {/* Visual Effects */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Visual Effects</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Opacity"
                    value={editElementOpacity}
                    type="number"
                    placeholder="1.0"
                    step={0.1}
                    min={0}
                    max={1}
                    onChange={handleElementOpacityChange}
                    onBlur={handleElementOpacityBlur}
                  />
                  <Input
                    label="Rotation"
                    value={editElementRotation}
                    type="number"
                    placeholder="0"
                    unit="°"
                    step={1}
                    onChange={handleElementRotationChange}
                    onBlur={handleElementRotationBlur}
                  />
                </div>
              </div>
            </div>
            
            {/* Timing */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Timing</h4>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Animation Delay"
                  value={editElementDelay}
                  type="number"
                  placeholder="0"
                  unit="ms"
                  step={100}
                  min={0}
                  onChange={handleElementDelayChange}
                  onBlur={handleElementDelayBlur}
                />
              </div>
            </div>
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
        Click the edit icon on a page, audio, or element item to start editing. This tab only appears when editing is active.
      </p>
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <div>• Pages: Edit name, duration, and background color</div>
        <div>• Audios: Edit volume, timing, and playback settings</div>
        <div>• Elements: Edit text, position, size, color, and timing</div>
      </div>
    </div>
  );
}