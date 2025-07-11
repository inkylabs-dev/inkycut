import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { 
  projectAtom,
  projectIdAtom,
  projectsMapAtom,
  getProjectById,
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
  generateRandomId,
  createDefaultPage
} from './atoms';

export default function VibeVideoCutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Jotai state atoms
  const [project] = useAtom(projectAtom);
  const [projectsMap, setProjectsMap] = useAtom(projectsMapAtom);
  const [projectId, setProjectId] = useAtom(projectIdAtom);
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
  
  // Initialize a new project and redirect if ID is 'new'
  useEffect(() => {
    if (id === 'new') {
      try {
        setIsLoading(true);
        
        // Generate a new unique ID
        const newProjectId = generateRandomId();
        
        // Create a new project with this ID
        const newProject = createDefaultProject(newProjectId);
        
        // Update both the projects map and set the current project ID
        setUpdateProject(newProject);
        setProjectId(newProjectId);
        
        // Add a small delay to ensure storage is updated
        setTimeout(() => {
          setIsLoading(false);
          navigate(`/vibe/${newProjectId}`, { replace: true });
        }, 200);
      } catch (err) {
        console.error('Error creating new project:', err);
        setError(new Error('Failed to create new project'));
        setIsLoading(false);
      }
    }
  }, [id, navigate, setProjectId, setUpdateProject, setIsLoading, setError]);
  
  // Load project data from localStorage using the projectId atom
  useEffect(() => {
    // Skip for 'new' projects as they are handled in the first useEffect
    if (id && id !== 'new') {
      try {
        setIsLoading(true);
        
        // Always set the projectId to ensure the projectAtom gets updated
        setProjectId(id);
        
        // Get the project directly from the map
        const loadedProject = projectsMap[id];
        
        if (loadedProject) {
          // If the project exists but doesn't have a selected page, select the first page
          if (loadedProject.composition && 
              loadedProject.composition.pages && 
              loadedProject.composition.pages.length > 0 && 
              !loadedProject.appState?.selectedPageId) {
            
            const updatedProject = {
              ...loadedProject,
              appState: {
                ...loadedProject.appState || {},
                selectedPageId: loadedProject.composition.pages[0].id
              }
            };
            setUpdateProject(updatedProject);
          } else if (!loadedProject.composition?.pages?.length) {
            // Create default composition with a single page if it doesn't exist
            const defaultPage = createDefaultPage();
            
            // Update the project with the default composition and select the page
            const updatedProject = {
              ...loadedProject,
              composition: {
                ...loadedProject.composition,
                pages: [defaultPage]
              },
              appState: {
                ...loadedProject.appState || {},
                selectedPageId: defaultPage.id
              }
            };
            setUpdateProject(updatedProject);
          } else {
            // Project is valid and has pages, just ensure the projectId is properly set
            // This is crucial for newly created projects after redirect
            setProjectId(id);
          }
        } else {
          // Project ID exists but no corresponding project in storage,
          // create a new one with this ID
          const newProject = createDefaultProject(id);
          setUpdateProject(newProject);
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError(new Error('Failed to load project'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [id, projectsMap, setProjectId, setUpdateProject, setIsLoading, setError]);

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
    if (project && project.id) {
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
    // Use Jotai atom to add chat messages
    setAddChatMessage(message);
  };

  const handleCompositionUpdate = async (composition: any) => {
    // Use Jotai atom to update composition
    setUpdateComposition(composition);
  };

  // Special effect to ensure project is loaded when coming from a redirect
  // This helps fix the "Project not found" issue after redirect from /vibe/new
  useEffect(() => {
    // If we have a valid ID but no project, and we're not already loading
    if (id && id !== 'new' && !project && !isLoading) {
      // Check if the project exists in storage
      const storedProject = projectsMap[id];
      
      if (storedProject) {
        // Project exists in storage but isn't loaded in state
        setProjectId(id);
      } else if (!project) {
        // Project doesn't exist in storage, create it
        const newProject = createDefaultProject(id);
        setUpdateProject(newProject);
      }
    }
  }, [id, project, projectsMap, isLoading, setProjectId, setUpdateProject]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <div className="ml-4 text-gray-700">Loading project...</div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">Error loading project: {error.message}</div>
      </div>
    );
  }

  // If we just redirected from /new, projectId should be set but project may not be loaded yet
  // Check both projectId and project to handle the transition after redirect
  if (!project) {
    // Add a special case for when we're looking at a valid ID (not 'new')
    if (id && id !== 'new') {
      // Force a loading state to wait for the project to be loaded from storage
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <div className="mt-4 text-gray-700">Initializing project...</div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-xl">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Main content area without top banner */}
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Panel - File Explorer / Elements */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
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
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
          <RightPanel
            onSendMessage={handleChatMessage}
          />
        </div>
      </div>
    </div>
  );
}
