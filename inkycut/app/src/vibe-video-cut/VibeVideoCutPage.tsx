import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { 
  projectAtom,
  selectedElementAtom,
  selectedPageAtom,
  chatMessagesAtom,
  loadingAtom,
  errorAtom,
  updateElementAtom,
  updateCompositionAtom,
  addChatMessageAtom,
  createDefaultProject,
  loadProjectFromStorage,
  generateRandomId,
  createDefaultPage
} from './atoms';

export default function VibeVideoCutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Jotai state atoms
  const [project, setProject] = useAtom(projectAtom);
  const [selectedElement, setSelectedElement] = useAtom(selectedElementAtom);
  const [selectedPage, setSelectedPage] = useAtom(selectedPageAtom);
  const [chatMessages] = useAtom(chatMessagesAtom);
  const [isLoading, setIsLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  
  // Always allow direct JSON editing
  const propertiesEnabled = true;
  
  // Redirect if ID is 'new'
  useEffect(() => {
    if (id === 'new') {
      const newProjectId = generateRandomId();
      navigate(`/vibe/${newProjectId}`, { replace: true });
    }
  }, [id, navigate]);
  
  // Load project data from localStorage
  useEffect(() => {
    if (id && id !== 'new') {
      try {
        setIsLoading(true);
        const loadedProject = loadProjectFromStorage(id);
        
        if (loadedProject) {
          setProject(loadedProject);
          
          // Set the first page as selected page or create a default one if no pages exist
          if (loadedProject.composition && loadedProject.composition.pages && loadedProject.composition.pages.length > 0) {
            setSelectedPage(loadedProject.composition.pages[0]);
          } else {
            // Create default composition with a single page if it doesn't exist
            const defaultPage = createDefaultPage();
            
            // Update the project with the default composition
            const updatedProject = {
              ...loadedProject,
              composition: {
                ...loadedProject.composition,
                pages: [defaultPage]
              }
            };
            setProject(updatedProject);
            setSelectedPage(defaultPage);
          }
        } else {
          // Project doesn't exist, create a new one locally
          const newProject = createDefaultProject(id);
          setProject(newProject);
          setSelectedPage(newProject.composition.pages[0]);
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
        setError(new Error('Failed to load project from localStorage'));
      } finally {
        setIsLoading(false);
      }
    } else if (id === 'new') {
      // Skip loading for new projects as we'll redirect
      setIsLoading(false);
    }
  }, [id, setProject, setSelectedPage, setIsLoading, setError]);

  // Import necessary update atoms from the atoms file
  const setUpdateElement = useSetAtom(updateElementAtom);
  const setUpdateComposition = useSetAtom(updateCompositionAtom);
  const setAddChatMessage = useSetAtom(addChatMessageAtom);

  const handleElementSelect = (element: any) => {
    setSelectedElement(element);
  };

  const handlePageSelect = (page: any) => {
    setSelectedPage(page);
  };

  const handleTimelineUpdate = (timeline: any[]) => {
    if (project && project.id) {
      try {
        // Update project with timeline
        // Store timeline in metadata which is now properly typed
        setProject({
          ...project,
          updatedAt: new Date().toISOString(),
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


  // Element update now uses Jotai atom
  const handleElementUpdate = (elementId: string, updatedData: any) => {
    // Use Jotai atom to update element
    setUpdateElement({ elementId, updatedData });
  };

  // Auto-save functionality removed to make the app fully offline
  // No auto-saving to server or localStorage, changes are only saved when
  // the user explicitly clicks "Save" or uses Cmd/Ctrl+S

  // No undo/redo functionality in offline mode

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">Error loading project: {error.message}</div>
      </div>
    );
  }

  if (!project) {
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
            onElementSelect={handleElementSelect}
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
