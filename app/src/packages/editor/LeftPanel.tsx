import React, { useState, useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  DocumentIcon, 
  HomeIcon,
  Bars3Icon,
  HeartIcon,
  ArrowPathIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShareIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
// import { useAuth } from 'wasp/client/auth';
// import { routes } from 'wasp/client/router';
import { Link } from 'react-router-dom';
import { CompositionElement, LocalFile } from './types';
import { projectAtom, selectedElementAtom, selectedPageAtom, setSelectedElementAtom, setSelectedPageAtom, createDefaultProject, filesAtom, chatMessagesAtom, clearAllFilesAtom, forkProjectAtom, isSharedProjectAtom } from './atoms';
import LocalFileUpload from './LocalFileUpload';
import ElementPreview from './ElementPreview';
import FileListItem from './FileListItem';
import SettingsDialog from './SettingsDialog';
import ImportDialog from './ImportDialog';
import ExportDialog from './ExportDialog';
import ShareDialog from './ShareDialog';
import { createFileResolver } from './utils/fileResolver';

interface MenuConfig {
  showImport?: boolean;
  showExport?: boolean;
  showShare?: boolean;
  showForkAndEdit?: boolean;
  showReset?: boolean;
  showSettings?: boolean;
  showHome?: boolean;
  showFollow?: boolean;
  showGitHub?: boolean;
}

interface LeftPanelProps {
  onElementUpdate?: (elementId: string, updatedData: Partial<CompositionElement> | any) => void;
  isReadOnly?: boolean;
  disableFileUpload?: boolean;
  menuConfig?: MenuConfig;
  onForkAndEdit?: () => void;
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>;
  showImportDialog?: boolean;
  setShowImportDialog?: (show: boolean) => void;
}

export default function LeftPanel({ 
  onElementUpdate, 
  isReadOnly = false,
  disableFileUpload = false,
  menuConfig = {
    showImport: true,
    showExport: true,
    showShare: true,
    showForkAndEdit: false,
    showReset: true,
    showSettings: true,
    showHome: true,
    showFollow: true,
    showGitHub: true,
  },
  onForkAndEdit,
  onShare,
  showImportDialog: propShowImportDialog,
  setShowImportDialog: propSetShowImportDialog
}: LeftPanelProps) {
  // Use Jotai atoms instead of props
  const [project, setProject] = useAtom(projectAtom);
  const [selectedElement] = useAtom(selectedElementAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  
  const [activeTab, setActiveTab] = useState<'files' | 'elements'>('files');
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [internalShowImportDialog, setInternalShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Use prop-based ImportDialog state when available, otherwise use internal state
  const showImportDialog = propShowImportDialog !== undefined ? propShowImportDialog : internalShowImportDialog;
  const setShowImportDialog = propSetShowImportDialog !== undefined ? propSetShowImportDialog : setInternalShowImportDialog;
  const menuRef = useRef<HTMLDivElement>(null);
  // const { data: user } = useAuth();
  const [localFiles] = useAtom(filesAtom);
  const [, setChatMessages] = useAtom(chatMessagesAtom);
  const clearAllFiles = useSetAtom(clearAllFilesAtom);
  const [isSharedProject, setIsSharedProject] = useAtom(isSharedProjectAtom);
  const forkProject = useSetAtom(forkProjectAtom);

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
  const handleResetProject = async () => {
    if (window.confirm('Are you sure you want to reset the project? All unsaved changes and files will be lost.')) {
      try {
        // Clear all files from current storage (only for local projects)
        if (!isSharedProject) {
          await clearAllFiles();
        }
        
        // Create a new project with default settings
        const newProject = createDefaultProject('Untitled Project');
        
        // Keep the current project ID if available
        if (project?.id) {
          newProject.id = project.id;
        }
        
        // Reset to local project mode
        setIsSharedProject(false);
        
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
      } catch (error) {
        console.error('Failed to reset project:', error);
        alert('Failed to reset project. Please try again.');
      }
    }
  };

  // Function to fork a shared project to local
  const handleForkAndEdit = async () => {
    if (!project) return;
    
    try {
      // Fork the project (migrates files from memory to IndexedDB)
      await forkProject();
      
      // Create the forked project with new metadata
      const forkedProject = {
        ...project,
        id: `forked-${Date.now()}`, // Generate new ID
        name: `${project.name} (Forked)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Reset appState for editing
        appState: {
          selectedElementId: null,
          selectedPageId: project.composition?.pages?.[0]?.id || null,
          viewMode: 'edit' as const,
          zoomLevel: 1,
          showGrid: false,
          isLoading: false,
          error: null,
          history: { past: [], future: [] }
        }
      };

      // Update the project
      setProject(forkedProject);
      
      // Clear chat messages and reset to welcome message
      setChatMessages([
        {
          id: 1,
          role: 'assistant',
          content: 'Project forked successfully! I\'m your AI assistant. How can I help you edit your forked project?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Close menu after fork
      setShowMenu(false);
      
      // Notify the caller if provided
      if (onForkAndEdit) {
        onForkAndEdit();
      }
    } catch (error) {
      console.error('Failed to fork project:', error);
      alert('Failed to fork project. Please try again.');
    }
  };


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





  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark">
        <div className="flex items-center mb-4">
          {!isReadOnly && (
            <div className="relative">
              <button 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none" 
                onClick={() => setShowMenu(!showMenu)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            
            {showMenu && (
              <div 
                ref={menuRef}
                className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-boxdark ring-1 ring-black dark:ring-strokedark ring-opacity-5 z-10"
              >
                <div className="py-1">
                  {menuConfig.showForkAndEdit && (
                    <button
                      onClick={() => {
                        if (onForkAndEdit) {
                          onForkAndEdit();
                        } else {
                          handleForkAndEdit();
                        }
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <DocumentDuplicateIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Fork and Edit
                    </button>
                  )}
                  
                  {menuConfig.showImport && (
                    <button
                      onClick={() => {
                        setShowImportDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <ArrowDownTrayIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Import Project
                    </button>
                  )}
                  
                  {menuConfig.showExport && (
                    <button
                      onClick={() => {
                        setShowExportDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <ArrowUpTrayIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Export Project
                    </button>
                  )}
                  
                  {menuConfig.showShare && (
                    <button
                      onClick={() => {
                        setShowShareDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <ShareIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Share...
                    </button>
                  )}
                  
                  {menuConfig.showReset && (
                    <button
                      onClick={handleResetProject}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Reset Project
                    </button>
                  )}
                  
                  {menuConfig.showSettings && (
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <CogIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Settings...
                    </button>
                  )}
                  
                  {menuConfig.showHome && (
                    <Link 
                      to="/"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <HomeIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Home Page
                    </Link>
                  )}
                  
                  {menuConfig.showFollow && (
                    <a 
                      href="https://twitter.com/inkycut" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <HeartIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      Follow Us
                    </a>
                  )}
                  
                  {menuConfig.showGitHub && (
                    <a 
                      href="https://github.com/inkylabs-dev/inkycut" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            )}
            </div>
          )}
        </div>
        <div className="text-gray-500 text-sm">
          {/* Creator information can be shown here if available */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-strokedark">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'files'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'elements'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Project Assets</h3>
            </div>
            
            {/* File Upload Section - disabled based on prop */}
            {!disableFileUpload && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Add Local Files</h4>
                <LocalFileUpload
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  buttonText="Add to Project"
                  className="mb-4"
                />
              </div>
            )}
            {/* Local Files Section */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Project Files</h4>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No files added yet</div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'elements' && (
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
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Share Dialog */}
      {onShare && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          onShare={onShare}
        />
      )}
    </div>
  );
}
