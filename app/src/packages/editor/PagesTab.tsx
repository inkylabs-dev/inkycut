import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { projectAtom, addUserMessageToQueueAtom } from './atoms';
import { CompositionPage } from '../composition/types';
import DragDropProvider from './DragDropProvider';
import DraggablePageListItem from './DraggablePageListItem';
import Input from './components/Input';

export default function PagesTab() {
  const [project, setProject] = useAtom(projectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  
  // Local state for edit panel inputs
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editBackgroundColor, setEditBackgroundColor] = useState('');

  // Get selected page
  const selectedPageId = project?.appState?.selectedPageId;
  const selectedPage = project?.composition?.pages?.find(page => page.id === selectedPageId);

  // Update edit inputs when selected page changes
  useEffect(() => {
    if (selectedPage) {
      setEditName(selectedPage.name || '');
      // Convert frames to seconds for display
      const fps = project?.composition?.fps || 30;
      const seconds = Math.round((selectedPage.duration / fps) * 100) / 100;
      setEditDuration(seconds.toString());
      setEditBackgroundColor(selectedPage.backgroundColor || '');
    } else {
      setEditName('');
      setEditDuration('');
      setEditBackgroundColor('');
    }
  }, [selectedPage, project?.composition?.fps]);

  if (!project?.composition?.pages) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pages</h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No pages found</div>
      </div>
    );
  }

  const pages = project.composition.pages;

  const handleDeletePage = (page: CompositionPage) => {
    const command = `/del-page --id ${page.id}`;
    addUserMessageToQueue(command);
  };

  const handleCopyPageId = (page: CompositionPage) => {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern Clipboard API
      navigator.clipboard.writeText(page.id).catch(() => {
        console.error('Failed to copy page ID to clipboard');
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = page.id;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy page ID to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleMovePageBefore = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-page ${pages[dragIndex].id} --before ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handleMovePageAfter = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-page ${pages[dragIndex].id} --after ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handlePageClick = (page: CompositionPage) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        selectedPageId: page.id
      }
    };
    
    setProject(updatedProject);
  };

  // Handle edit panel input changes (only update local state)
  const handleNameChange = (newName: string) => {
    setEditName(newName);
  };

  const handleDurationChange = (newDuration: string) => {
    setEditDuration(newDuration);
  };

  const handleBackgroundColorChange = (newColor: string) => {
    setEditBackgroundColor(newColor);
  };

  // Handle blur events (update project state)
  const handleNameBlur = () => {
    if (selectedPageId && editName.trim() !== selectedPage?.name) {
      const command = `/set-page --id ${selectedPageId} --name "${editName.trim()}"`;
      addUserMessageToQueue(command);
    }
  };

  const handleDurationBlur = () => {
    if (selectedPageId && editDuration.trim()) {
      // Convert seconds to appropriate format for slash command
      const duration = parseFloat(editDuration);
      if (!isNaN(duration) && duration > 0) {
        const command = `/set-page --id ${selectedPageId} --duration ${duration}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleBackgroundColorBlur = () => {
    if (selectedPageId && editBackgroundColor.trim() !== selectedPage?.backgroundColor) {
      const command = `/set-page --id ${selectedPageId} --background-color "${editBackgroundColor.trim()}"`;
      addUserMessageToQueue(command);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pages</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="space-y-2">
        <DragDropProvider>
          {pages.map((page, index) => (
            <div key={page.id}>
              <DraggablePageListItem
                page={page}
                index={index}
                fps={project.composition.fps}
                onDelete={() => handleDeletePage(page)}
                onCopyId={() => handleCopyPageId(page)}
                onClick={() => handlePageClick(page)}
                isSelected={project.appState?.selectedPageId === page.id}
                onMovePageBefore={handleMovePageBefore}
                onMovePageAfter={handleMovePageAfter}
              />
              
              {/* Edit Panel for Selected Page - appears right under the selected page */}
              {selectedPage && selectedPage.id === page.id && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Page</h4>
                  
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
              )}
            </div>
          ))}
        </DragDropProvider>
      </div>
    </div>
  );
}