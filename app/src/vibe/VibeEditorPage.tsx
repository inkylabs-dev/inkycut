import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { LeftPanel, MiddlePanel, RightPanel } from '../packages/editor';
import { 
  projectAtom,
  updateProjectAtom,
  selectedElementAtom,
  selectedPageAtom,
  chatMessagesAtom,
  loadingAtom,
  errorAtom,
  setLoadingAtom,
  setErrorAtom,
  updateElementAtom,
  updateCompositionAtom,
  addChatMessageAtom,
  setSelectedElementAtom,
  setSelectedPageAtom,
  createDefaultProject,
  createDefaultPage,
  ensureCompositionIDs,
  createServerSafeProject
} from '../packages/editor';
import { processVideoAIPrompt } from 'wasp/client/operations';

export default function VibeEditorPage () {
  const navigate = useNavigate();
  
  // Jotai state atoms
  const [project, setProject] = useAtom(projectAtom);
  const [selectedElement] = useAtom(selectedElementAtom);
  const [selectedPage] = useAtom(selectedPageAtom);
  const [chatMessages] = useAtom(chatMessagesAtom);
  const [isLoading] = useAtom(loadingAtom);
  const [error] = useAtom(errorAtom);
  
  // Set atoms
  const setSelectedElement = useSetAtom(setSelectedElementAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  const setUpdateProject = useSetAtom(updateProjectAtom);
  const setIsLoading = useSetAtom(setLoadingAtom);
  const setError = useSetAtom(setErrorAtom);
  
  // Always allow direct JSON editing
  const propertiesEnabled = true;
  
  // Initialize the project if none exists, with proper localStorage handling
  useEffect(() => {
    let isMounted = true;
    
    const initProject = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        // Check localStorage directly first to see if we have data
        const storedProjectString = localStorage.getItem('vibe-project');
        let storedProject: any = null;
        
        if (storedProjectString && storedProjectString !== 'null') {
          try {
            storedProject = JSON.parse(storedProjectString);
            
            // Ensure all pages and elements have IDs when loading from localStorage
            if (storedProject && storedProject.composition) {
              storedProject.composition = ensureCompositionIDs(storedProject.composition);
            }
          } catch (parseErr) {
            console.error('Error parsing stored project data:', parseErr);
          }
        }
        
        // If we have valid data in localStorage but Jotai hasn't loaded it yet,
        // let's manually set it
        if (storedProject && !project) {
          console.log('Found project in localStorage, restoring it');
          setProject(storedProject);
        } 
        // Only create a new project if there's nothing in localStorage and no project in state
        else if (!storedProject && !project) {
          console.log('No project found, creating a new one');
          const newProject = createDefaultProject("My Vibe Project");
          setUpdateProject(newProject);
        }
      } catch (err) {
        console.error('Error initializing project:', err);
        setError(new Error('Failed to initialize project'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initProject();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [project, setProject, setUpdateProject, setIsLoading, setError]);
  
  // Ensure the project has valid pages
  useEffect(() => {
    // Skip if project is loading or doesn't exist
    if (!project) return;
    
    let isMounted = true;
    
    const ensureValidPages = () => {
      try {
        // If the project exists but doesn't have a selected page, select the first page
        if (project.composition && 
            project.composition.pages && 
            project.composition.pages.length > 0 && 
            !project.appState?.selectedPageId) {
          
          const updatedProject = {
            ...project,
            appState: {
              ...project.appState || {},
              selectedPageId: project.composition.pages[0].id
            }
          };
          if (isMounted) setUpdateProject(updatedProject);
        } else if (!project.composition?.pages?.length) {
          // Create default composition with a single page if it doesn't exist
          const defaultPage = createDefaultPage();
          
          // Update the project with the default composition and select the page
          const updatedProject = {
            ...project,
            composition: {
              ...project.composition || {},
              pages: [defaultPage]
            },
            appState: {
              ...project.appState || {},
              selectedPageId: defaultPage.id
            }
          };
          if (isMounted) setUpdateProject(updatedProject);
        }
      } catch (err) {
        console.error('Error updating project pages:', err);
        if (isMounted) setError(new Error('Failed to update project pages'));
      }
    };
    
    ensureValidPages();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [project, setUpdateProject, setError]);

  // Import necessary update atoms from the atoms file
  const setUpdateElement = useSetAtom(updateElementAtom);
  const setUpdateComposition = useSetAtom(updateCompositionAtom);
  const setAddChatMessage = useSetAtom(addChatMessageAtom);

  const handleElementSelect = (element: any) => {
    // Use the set atom to update the selection in appState
    setSelectedElement(element);
  };

  const handlePageSelect = (page: any) => {
    // Use the set atom to update the selection in appState
    setSelectedPage(page);
  };

  const handleTimelineUpdate = (timeline: any[]) => {
    if (project) {
      try {
        // Update project with timeline
        // Store timeline in metadata which is now properly typed
        setUpdateProject({
          ...project,
          metadata: {
            ...(project.metadata || {}),
            timeline
          }
        });
      } catch (error) {
        console.error('Failed to update timeline:', error);
      }
    }
  };

  const handleChatMessage = (message: string) => {
    // Add the user message to chat using the atom
    setAddChatMessage({
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
  };

  const handleCompositionUpdate = async (composition: any) => {
    // Use Jotai atom to update composition
    setUpdateComposition(composition);
  };

  // This effect has been removed as we're now using a single project model
  // The initialization logic is handled in the first useEffect

  // Element update now uses Jotai atom
  const handleElementUpdate = (elementId: string, updatedData: any) => {
    // Use Jotai atom to update element
    setUpdateElement({ elementId, updatedData });
  };

  // Auto-save functionality removed to make the app fully offline
  // No auto-saving to server or localStorage, changes are only saved when
  // the user explicitly clicks "Save" or uses Cmd/Ctrl+S

  // No undo/redo functionality in offline mode

  // Show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white"></div>
        <div className="ml-4 text-gray-700 dark:text-gray-300">Loading project...</div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="text-red-500 dark:text-red-400 text-xl">Error loading project: {error.message}</div>
      </div>
    );
  }

  // Show message if no project is loaded
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="text-gray-500 dark:text-gray-400 text-xl">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 dark:bg-boxdark-2">
      {/* Main content area without top banner */}
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Panel - Files / Elements */}
        <div className="w-80 bg-white dark:bg-boxdark border-r border-gray-200 dark:border-strokedark flex-shrink-0 overflow-hidden">
          <LeftPanel 
            onElementUpdate={handleElementUpdate}
          />
        </div>

        {/* Middle Panel - Remotion Player */}
        <div className="flex-1 overflow-hidden">
          <MiddlePanel
            onTimelineUpdate={handleTimelineUpdate}
            onCompositionUpdate={handleCompositionUpdate}
            onPageSelect={handlePageSelect}
          />
        </div>

        {/* Right Panel - Chat UI only */}
        <div className="w-80 bg-white dark:bg-boxdark border-l border-gray-200 dark:border-strokedark flex-shrink-0 overflow-hidden">
          <RightPanel
            onSendMessage={handleChatMessage}
            onHandleMessage={async (message: string) => {
              // Process the AI prompt using the wasp operation
              if (project) {
                // Create a server-safe version of the project (without files and appState)
                const serverSafeProject = createServerSafeProject(project);
                
                const response = await processVideoAIPrompt({
                  projectId: project.id || 'default',
                  prompt: message,
                  projectData: serverSafeProject,
                  apiKey: localStorage.getItem('openai-api-key') || '',
                });
                
                // Update the project with AI changes if provided
                if (response.updatedProject) {
                  // Merge the updated project with the current project (preserving files and appState)
                  const updatedProject = {
                    ...project,
                    ...response.updatedProject,
                    // Preserve client-side state
                    files: project.files,
                    appState: project.appState,
                  };
                  
                  setUpdateProject(updatedProject);
                }
                
                return response;
              }
              
              return {
                message: "No project loaded. Please create or load a project first.",
                updatedProject: null
              };
            }}
          />
        </div>
      </div>
    </div>
  );
}
