import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { CompositionElement } from '../composition/types';
import { selectedElementAtom, selectedPageAtom, setSelectedElementAtom, filesAtom } from './atoms';
import ElementPreview from './ElementPreview';
import { createFileResolver } from '../composition/utils/fileResolver';

export default function ElementTab() {
  const [selectedElement] = useAtom(selectedElementAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const [localFiles] = useAtom(filesAtom);

  // Create file resolver from local files
  const fileResolver = React.useMemo(() => {
    return createFileResolver(localFiles);
  }, [localFiles]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {selectedPage ? `${selectedPage.name} Elements` : 'Page Elements'}
        </h3>
      </div>
      
      {selectedPage && selectedPage.elements ? (
        <div className="space-y-2">
          {selectedPage.elements.map((element: CompositionElement) => (
            <div
              key={element.id}
              className={`p-3 rounded cursor-pointer border ${
                selectedElement?.id === element.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setSelectedElement(element)}
            >
              <div className="flex items-center">
                <ElementPreview element={element} className="w-12 h-12 mr-3" fileResolver={fileResolver} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {element.type === 'text' ? 
                      (element.text ? 
                        (element.text.length > 20 ? `${element.text.substring(0, 20)}...` : element.text) 
                        : 'Text Element'
                      ) : 
                      (element.src ? 
                        element.src.split('/').pop() || `${element.type} Element` 
                        : `${element.type} Element`)
                    }
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize flex items-center">
                    <span className="mr-2">{element.type}</span>
                    {element.delay !== undefined && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                        delay: {element.delay}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
