import React, { useState, useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  DocumentIcon, 
  HomeIcon,
  Bars3Icon,
  HeartIcon,
  ArrowPathIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
import { Link } from 'react-router-dom';
import { CompositionElement } from '@inkycut/editor';
import { projectAtom, selectedElementAtom, selectedPageAtom, setSelectedElementAtom, setSelectedPageAtom, createDefaultProject, filesAtom, chatMessagesAtom } from '@inkycut/editor';
import LocalFileUpload from './LocalFileUpload';
import ElementPreview from './ElementPreview';
import FileListItem from './FileListItem';
import SettingsDialog from './SettingsDialog';
import { LocalFile } from '@inkycut/editor';
import { createFileResolver } from '../utils/fileResolver';

interface LeftPanelProps {
  onElementUpdate?: (elementId: string, updatedData: Partial<CompositionElement> | any) => void;
}

export default function LeftPanel({ onElementUpdate }: LeftPanelProps) {
  // Use Jotai atoms instead of props
  const [project, setProject] = useAtom(projectAtom);
  const [selectedElement] = useAtom(selectedElementAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  
  // Always enabled
  const propertiesEnabled = true;
  const [activeTab, setActiveTab] = useState<'files' | 'elements'>('files');
  const [recentlyUpdated, setRecentlyUpdated] = useState<{[key: string]: boolean}>({});
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: user } = useAuth();
  const [localFiles] = useAtom(filesAtom);
  const [, setChatMessages] = useAtom(chatMessagesAtom);

  // Create file resolver from local files
  const fileResolver = React.useMemo(() => {
    return createFileResolver(localFiles);
  }, [localFiles]);

  const handleUploadComplete = (uploadedFile: LocalFile) => {
    console.log('File added successfully:', uploadedFile);
  };

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error);
  };
  
  // Function to reset the project to its default state
  const handleResetProject = () => {
    if (window.confirm('Are you sure you want to reset the project? All unsaved changes will be lost.')) {
      // Create a new project with default settings
      const newProject = createDefaultProject('Untitled Project');
      
      // Keep the current project ID if available
      if (project?.id) {
        newProject.id = project.id;
      }
      
      // Reset the project
      setProject(newProject);
      
      // Update selected page to the first page of the new project
      if (newProject.composition.pages.length > 0) {
        setSelectedPage(newProject.composition.pages[0]);
      }
      
      // Clear selected element
      setSelectedElement(null);
      
      // Clear chat history and reset to welcome message
      setChatMessages([
        {
          id: 1,
          role: 'assistant',
          content: 'Welcome to Vibe Video Cut! I\'m your AI assistant. How can I help you create amazing videos today?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Close menu after reset
      setShowMenu(false);
    }
  };

  // Reset recently updated state when selected element changes
  useEffect(() => {
    setRecentlyUpdated({});
  }, [selectedElement]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Helper function to handle element updates
  const handleElementUpdate = (key: keyof CompositionElement, value: any) => {
    if (onElementUpdate && selectedElement?.id) {
      const update = { [key]: value } as Partial<CompositionElement>;
      onElementUpdate(selectedElement.id, update);
      
      // Visual feedback for change
      setRecentlyUpdated(prev => ({ ...prev, [key]: true }));
      
      // Clear visual feedback after a delay
      setTimeout(() => {
        setRecentlyUpdated(prev => ({ ...prev, [key]: false }));
      }, 800);
    }
  };

  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };



  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center mb-4">
          <div className="relative">
            <button 
              className="text-gray-700 hover:text-gray-900 focus:outline-none" 
              onClick={() => setShowMenu(!showMenu)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {showMenu && (
              <div 
                ref={menuRef}
                className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
              >
                <div className="py-1">
                  <button
                    onClick={handleResetProject}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                  >
                    <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Reset Project
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                  >
                    <CogIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Settings...
                  </button>
                  
                  <Link 
                    to="/"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <HomeIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Home Page
                  </Link>
                  
                  <a 
                    href="https://twitter.com/inkycut" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <HeartIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Follow Us
                  </a>
                  
                  <a 
                    href="https://github.com/inkylabs-dev/inkycut" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-gray-500 text-sm">
          {/* Creator information can be shown here if available */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'files'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'elements'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Elements
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'files' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Project Assets</h3>
            </div>
            
            {/* File Upload Section */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Add Local Files</h4>
              <LocalFileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                buttonText="Add to Project"
                className="mb-4"
              />
            </div>
            {/* Local Files Section */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Project Files</h4>
              <div className="space-y-2">
                {localFiles.length > 0 ? (
                  localFiles.map((file: LocalFile) => (
                    <FileListItem
                      key={file.id}
                      file={file}
                      onElementUpdate={onElementUpdate}
                    />
                  ))
                ) : (
                  <div className="text-xs text-gray-500 py-2">No files added yet</div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'elements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
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
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedElement(element)}
                  >
                    <div className="flex items-center">
                      <ElementPreview element={element} className="w-12 h-12 mr-3" fileResolver={fileResolver} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
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
                        <div className="text-xs text-gray-500 capitalize flex items-center">
                          <span className="mr-2">{element.type}</span>
                          {element.startTime !== undefined && element.endTime !== undefined && (
                            <span className="text-xs bg-gray-100 px-1 rounded">
                              {element.startTime}s - {element.endTime}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">
                  <DocumentIcon className="h-12 w-12 mx-auto text-gray-300" />
                </div>
                <p className="text-sm">
                  {selectedPage ? 'No elements in this page' : 'Click on a page block to view its elements'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
