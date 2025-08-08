import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { CompositionElement } from '../composition/types';
import { selectedElementAtom, selectedPageAtom, setSelectedElementAtom, filesAtom, projectAtom, addUserMessageToQueueAtom } from './atoms';
import DragDropProvider from './DragDropProvider';
import DraggableElementListItem from './DraggableElementListItem';

export default function ElementTab() {
  const [selectedElement] = useAtom(selectedElementAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const [project, setProject] = useAtom(projectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);

  if (!project?.composition?.pages) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Page Elements
          </h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No project loaded</div>
      </div>
    );
  }

  const elements = selectedPage?.elements || [];

  const handleDeleteElement = (element: CompositionElement) => {
    const command = `/del-elem --id ${element.id}`;
    addUserMessageToQueue(command);
  };

  const handleCopyElementId = (element: CompositionElement) => {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern Clipboard API
      navigator.clipboard.writeText(element.id).catch(() => {
        console.error('Failed to copy element ID to clipboard');
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = element.id;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy element ID to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleMoveElementBefore = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-element ${elements[dragIndex].id} --before ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handleMoveElementAfter = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-element ${elements[dragIndex].id} --after ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handleElementClick = (element: CompositionElement) => {
    setSelectedElement(element);
    
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        selectedElementId: element.id
      }
    };
    
    setProject(updatedProject);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {selectedPage ? `${selectedPage.name} Elements` : 'Page Elements'}
        </h3>
        {selectedPage && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {elements.length} element{elements.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {selectedPage && selectedPage.elements ? (
        <div className="space-y-2">
          <DragDropProvider>
            {selectedPage.elements.map((element: CompositionElement, index) => (
              <div key={element.id}>
                <DraggableElementListItem
                  element={element}
                  index={index}
                  onDelete={() => handleDeleteElement(element)}
                  onCopyId={() => handleCopyElementId(element)}
                  onClick={() => handleElementClick(element)}
                  isSelected={selectedElement?.id === element.id}
                  onMoveElementBefore={handleMoveElementBefore}
                  onMoveElementAfter={handleMoveElementAfter}
                />
              </div>
            ))}
          </DragDropProvider>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="mb-2">
            <DocumentIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm">
            {selectedPage ? 'No elements in this page' : 'Click on a page block to view its elements'}
          </p>
        </div>
      )}
    </div>
  );
}
