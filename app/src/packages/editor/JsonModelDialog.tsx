import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CompositionData } from '../composition/types';
import { projectAtom, updateProjectAtom, ensureCompositionIDs } from './atoms';

interface JsonModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
}

export const JsonModelDialog: React.FC<JsonModelDialogProps> = ({ 
  isOpen, 
  onClose, 
  onCompositionUpdate 
}) => {
  const [project] = useAtom(projectAtom);
  const [, updateProject] = useAtom(updateProjectAtom);
  
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize JSON string when dialog opens
  useEffect(() => {
    if (isOpen && project?.composition) {
      setJsonString(JSON.stringify(project.composition, null, 2));
      setJsonError(null);
      setHasChanges(false);
    }
  }, [isOpen, project?.composition]);

  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    setHasChanges(true);
    
    try {
      // Try to parse to validate JSON
      JSON.parse(newJson);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Ensure all pages and elements have IDs before saving
      const compositionWithIDs = ensureCompositionIDs(parsed);
      
      if (project) {
        const updatedProject = {
          ...project,
          composition: compositionWithIDs
        };
        
        updateProject(updatedProject);
        
        // In offline mode, save to localStorage
        if (project.id) {
          localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(compositionWithIDs));
        }
        
        // Notify parent component
        if (onCompositionUpdate) {
          onCompositionUpdate(compositionWithIDs);
        }
      }
      
      setHasChanges(false);
      onClose();
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) {
        return;
      }
    }
    onClose();
  };

  const handleReset = () => {
    if (project?.composition) {
      setJsonString(JSON.stringify(project.composition, null, 2));
      setJsonError(null);
      setHasChanges(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              JSON Model Editor
            </h2>
            {hasChanges && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                Unsaved changes
              </span>
            )}
          </div>
          
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-4 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Project: {project?.name || 'Untitled Project'}
              </div>
              {jsonError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  Error: {jsonError}
                </div>
              )}
            </div>
            
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* JSON Editor */}
          <div className="flex-1 min-h-0">
            <textarea
              value={jsonString}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full h-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Edit your composition JSON here..."
              spellCheck={false}
            />
          </div>

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: Edit the JSON directly to modify pages, elements, timing, and styling. 
            Make sure the JSON is valid before saving.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!!jsonError}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              jsonError
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};