import React, { useState, useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  HomeIcon,
  Bars3Icon,
  HeartIcon,
  ArrowPathIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { 
  projectAtom, 
  selectedElementAtom, 
  selectedPageAtom, 
  setSelectedElementAtom, 
  setSelectedPageAtom, 
  createDefaultProject, 
  chatMessagesAtom, 
  clearAllFilesAtom, 
  forkProjectAtom, 
  isSharedProjectAtom 
} from './atoms';

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
  showJsonModel?: boolean;
}

interface EditorMenuProps {
  isReadOnly?: boolean;
  menuConfig?: MenuConfig;
  onForkAndEdit?: () => void;
  onShowImportDialog: () => void;
  onShowExportDialog: () => void;
  onShowShareDialog: () => void;
  onShowJsonModelDialog: () => void;
  onShowSettings: () => void;
}

export default function EditorMenu({ 
  isReadOnly = false,
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
    showJsonModel: true,
  },
  onForkAndEdit,
  onShowImportDialog,
  onShowExportDialog,
  onShowShareDialog,
  onShowJsonModelDialog,
  onShowSettings
}: EditorMenuProps) {
  const [project, setProject] = useAtom(projectAtom);
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  const [, setChatMessages] = useAtom(chatMessagesAtom);
  const clearAllFiles = useSetAtom(clearAllFilesAtom);
  const [isSharedProject, setIsSharedProject] = useAtom(isSharedProjectAtom);
  const forkProject = useSetAtom(forkProjectAtom);
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (isReadOnly) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark">
        <div className="flex items-center mb-4">
          {/* Empty header for read-only mode */}
        </div>
        <div className="text-gray-500 text-sm">
          {/* Creator information can be shown here if available */}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark">
      <div className="flex items-center mb-4">
        <div className="relative">
          <button 
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" 
            data-testid="left-panel-menu-button"
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
                      onShowImportDialog();
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
                      onShowExportDialog();
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
                      onShowShareDialog();
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
                    data-testid="reset-project-button"
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                    Reset Project
                  </button>
                )}
                
                {menuConfig.showJsonModel && (
                  <button
                    onClick={() => {
                      onShowJsonModelDialog();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <CodeBracketIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                    JSON Model
                  </button>
                )}
                
                {menuConfig.showSettings && (
                  <button
                    onClick={() => {
                      onShowSettings();
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
      </div>
      <div className="text-gray-500 text-sm">
        {/* Creator information can be shown here if available */}
      </div>
    </div>
  );
}
