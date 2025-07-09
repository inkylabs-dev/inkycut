import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { CompositionData, CompositionElement, CompositionPage } from './components/Composition';

// No history stack items in offline mode

// Function to generate random project ID
const generateRandomId = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export default function VibeVideoCutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<CompositionPage | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  // Always allow direct JSON editing
  const [propertiesEnabled] = useState<boolean>(true);
  
  // Redirect if ID is 'new'
  useEffect(() => {
    if (id === 'new') {
      const newProjectId = generateRandomId();
      navigate(`/vibe/${newProjectId}`, { replace: true });
    }
  }, [id, navigate]);
  
  // No undo/redo state in offline mode
  
  // Replace API queries with local state management
  const [fetchedProject, setFetchedProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Load data from localStorage instead of API
  useEffect(() => {
    if (id && id !== 'new') {
      try {
        setIsLoading(true);
        const storageKey = `vibe-project-${id}`;
        const storedProject = localStorage.getItem(storageKey);
        
        if (storedProject) {
          setFetchedProject(JSON.parse(storedProject));
        } else {
          setFetchedProject(null);
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
        setError({ message: 'Failed to load project from localStorage' });
      } finally {
        setIsLoading(false);
      }
    } else if (id === 'new') {
      // Skip loading for new projects as we'll redirect
      setIsLoading(false);
    }
  }, [id]);

  // Create a default page for new projects or when no pages exist
  const createDefaultPage = useCallback((): CompositionPage => {
    return {
      id: `page-${Date.now()}`,
      name: 'Page 1',
      duration: 5 * 30, // 5 seconds at 30fps
      backgroundColor: 'white',
      elements: []
    };
  }, []);

  useEffect(() => {
    // Initialize chat with welcome message
    setChatMessages([
      {
        id: 1,
        role: 'assistant',
        content: 'Welcome to Vibe Video Cut! I\'m your AI assistant. How can I help you create amazing videos today?',
        timestamp: new Date()
      }
    ]);
  }, []);

  useEffect(() => {
    if (fetchedProject) {
      setProject(fetchedProject);
      // Always allow direct JSON editing regardless of configuration
      const projectData = fetchedProject as any;
      
      // Set the first page as selected page or create a default one if no pages exist
      if (projectData.composition && projectData.composition.pages && projectData.composition.pages.length > 0) {
        setSelectedPage(projectData.composition.pages[0]);
      } else {
        // Create default composition with a single page if it doesn't exist
        const defaultPage = createDefaultPage();
        const defaultComposition: CompositionData = {
          pages: [defaultPage],
          fps: 30,
          width: 1920,
          height: 1080
        };
        
        // Update the project with the default composition
        const updatedProject = {
          ...projectData,
          composition: defaultComposition
        };
        setProject(updatedProject);
        setSelectedPage(defaultPage);
        
        // Save to localStorage
        try {
          localStorage.setItem(`vibe-project-${updatedProject.id}`, JSON.stringify(updatedProject));
        } catch (error) {
          console.error('Failed to save default composition to localStorage:', error);
        }
      }
    } else if (!isLoading && !fetchedProject && !error) {
      // Project doesn't exist, create a new one locally
      const initializeProject = () => {
        try {
          // Create default composition with a blank page
          const defaultPage = createDefaultPage();
          const defaultComposition: CompositionData = {
            pages: [defaultPage],
            fps: 30,
            width: 1920,
            height: 1080
          };
          
          const newProject = {
            name: `Vibe Project ${id}`,
            id: id || `project-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            propertiesEnabled: true,
            composition: defaultComposition
          };
          
          // Save to localStorage
          localStorage.setItem(`vibe-project-${newProject.id}`, JSON.stringify(newProject));
          
          setProject(newProject);
          setSelectedPage(defaultPage);
        } catch (error) {
          console.error('Failed to create project:', error);
        }
      };
      initializeProject();
    }
  }, [fetchedProject, isLoading, error, id, createDefaultPage]);

  useEffect(() => {
    if (project && project.composition) {
      // Initialize selectedPage with the first page of the project
      const initialPage = project.composition.pages?.[0] || createDefaultPage();
      setSelectedPage(initialPage);
      
      // If no pages exist, add a default page
      if (project.composition.pages?.length === 0) {
        handleCompositionUpdate({
          ...project.composition,
          pages: [initialPage]
        });
      }
    }
  }, [project, createDefaultPage]);

  const handleElementSelect = (element: any) => {
    setSelectedElement(element);
  };

  const handlePageSelect = (page: any) => {
    setSelectedPage(page);
  };

  const handleTimelineUpdate = async (timeline: any[]) => {
    if (project && project.id) {
      try {
        // Update local state first
        setProject({
          ...project,
          timeline
        });
        
        // Save changes to localStorage
        saveChanges();
      } catch (error) {
        console.error('Failed to update timeline:', error);
      }
    }
  };

  const handleChatMessage = (message: string) => {
    // Add user message
    const userMessage = {
      id: chatMessages.length + 1,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Simulate AI response
    const aiResponse = {
      id: chatMessages.length + 2,
      role: 'assistant',
      content: `I received your message: "${message}". This is a mock response. In a real implementation, this would connect to an AI service.`,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage, aiResponse]);
  };

  const handleCompositionUpdate = async (composition: CompositionData) => {
    if (project && project.id) {
      try {        
        // Update local state first for immediate UI update
        setProject({
          ...project,
          composition
        });
        
        // If we have a selected element, find and update it in the new composition
        if (selectedElement) {
          const updatedElement = composition.pages
            .flatMap(page => page.elements)
            .find(el => el.id === selectedElement.id);
          
          if (updatedElement) {
            setSelectedElement(updatedElement);
          }
        }
        
        // Save changes to localStorage
        saveChanges();
      } catch (error) {
        console.error('Failed to update composition:', error);
      }
    }
  };


  // Local-only save to localStorage
  const saveChanges = useCallback(() => {
    // Save to localStorage if you want persistence between browser sessions
    if (project && project.id) {
      try {
        const storageKey = `vibe-project-${project.id}`;
        localStorage.setItem(storageKey, JSON.stringify(project));
        console.log(`Project ${project.id} saved to localStorage`);
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [project]);



  const handleElementUpdate = async (elementId: string, updatedData: Partial<CompositionElement>) => {
    if (project && project.composition) {
      // Create a deep copy of the composition data
      const updatedComposition = JSON.parse(JSON.stringify(project.composition)) as CompositionData;
      
      // Find and update the element
      let elementUpdated = false;
      updatedComposition.pages = updatedComposition.pages.map(page => {
        const elementIndex = page.elements.findIndex(el => el.id === elementId);
        if (elementIndex !== -1) {
          // Update element with new data
          page.elements[elementIndex] = {
            ...page.elements[elementIndex],
            ...updatedData
          };
          elementUpdated = true;
        }
        return page;
      });
      
      if (elementUpdated) {
        // Update local state first for immediate UI update
        setProject({
          ...project,
          composition: updatedComposition
        });
        
        // Also update selected element if it was the one that changed
        if (selectedElement && selectedElement.id === elementId) {
          setSelectedElement({
            ...selectedElement,
            ...updatedData
          });
        }
        
        // Call handleCompositionUpdate to ensure the JSON editor is updated
        // This is the key fix to sync with the JSON editor
        handleCompositionUpdate(updatedComposition);
        
        // Save changes to localStorage
        saveChanges();
      }
    }
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
            project={project}
            selectedElement={selectedElement}
            selectedPage={selectedPage}
            onElementSelect={handleElementSelect}
            onElementUpdate={handleElementUpdate}
            propertiesEnabled={propertiesEnabled}
          />
        </div>

        {/* Middle Panel - Remotion Player */}
        <div className="flex-1 overflow-hidden">
          <MiddlePanel
            project={project}
            selectedElement={selectedElement}
            onTimelineUpdate={handleTimelineUpdate}
            onCompositionUpdate={handleCompositionUpdate}
            onPageSelect={handlePageSelect}
            propertiesEnabled={propertiesEnabled}
          />
        </div>

        {/* Right Panel - Chat UI only */}
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
          <RightPanel
            messages={chatMessages}
            onSendMessage={handleChatMessage}
          />
        </div>
      </div>
    </div>
  );
}
