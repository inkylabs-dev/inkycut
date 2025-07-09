import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useAction } from 'wasp/client/operations';
import { getVibeProject, updateVibeProject, createVibeProject } from 'wasp/client/operations';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { CompositionData, CompositionElement, CompositionPage } from './components/Composition';

// Type for history stack items
interface HistoryItem {
  composition: CompositionData;
  selectedElementId: string | null;
}

export default function VibeVideoCutPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<CompositionPage | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  // Always allow direct JSON editing
  const [propertiesEnabled] = useState<boolean>(true);
  
  // Undo/redo history state
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { data: fetchedProject, isLoading, error } = useQuery(getVibeProject, { id: id! });
  const updateProject = useAction(updateVibeProject);
  const createProject = useAction(createVibeProject);

  // Create a default page for new projects or when no pages exist
  const createDefaultPage = useCallback((): CompositionPage => {
    return {
      id: `page-${Date.now()}`,
      name: 'Default Page',
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
      // Always allow direct JSON editing regardless of server configuration
      const projectData = fetchedProject as any;
      
      // Set the first page as selected page or create a default one if none exists
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
        
        // Save the default composition to the server
        updateProject({
          id: updatedProject.id,
          composition: defaultComposition,
          propertiesEnabled: true
        }).catch(err => {
          console.error('Failed to save default composition:', err);
        });
      }
    } else if (!isLoading && !fetchedProject && !error) {
      // Project doesn't exist, create a new one
      const initializeProject = async () => {
        try {
          // Create default composition with a blank page
          const defaultPage = createDefaultPage();
          const defaultComposition: CompositionData = {
            pages: [defaultPage],
            fps: 30,
            width: 1920,
            height: 1080
          };
          
          const newProject = await createProject({
            name: `Vibe Project ${id}`,
            id,
            // Always allow direct JSON editing
            propertiesEnabled: true,
            composition: defaultComposition
          });
          
          setProject(newProject);
          setSelectedPage(defaultPage);
        } catch (err) {
          console.error('Failed to create project:', err);
        }
      };
      initializeProject();
    }
  }, [fetchedProject, isLoading, error, id, createProject, updateProject, createDefaultPage]);

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
        const updatedProject = await updateProject({
          id: project.id,
          timeline
        });
        setProject(updatedProject);
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
        // Save current state to history before making changes
        if (selectedElement) {
          addToHistory(project.composition, selectedElement.id);
        }
        
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
        
        // Mark that we have unsaved changes
        setHasUnsavedChanges(true);
        
        // Note: We don't call updateProject here anymore
        // This function is called frequently during editing, and we want to batch saves
        // The saveChanges function will handle saving to the server
      } catch (error) {
        console.error('Failed to update composition:', error);
      }
    }
  };

  // Add to history before making changes
  const addToHistory = useCallback((composition: CompositionData, elementId: string | null) => {
    setUndoStack(prev => [
      ...prev, 
      { 
        composition: JSON.parse(JSON.stringify(composition)),
        selectedElementId: elementId
      }
    ]);
    // Clear redo stack when a new action is performed
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, []);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const lastAction = undoStack[undoStack.length - 1];
      
      // Save current state to redo stack
      setRedoStack(prev => [
        ...prev,
        { 
          composition: JSON.parse(JSON.stringify(project.composition)),
          selectedElementId: selectedElement?.id || null
        }
      ]);
      
      // Restore previous state
      setUndoStack(prev => prev.slice(0, -1));
      setProject((prevProject: any) => ({
        ...prevProject,
        composition: lastAction.composition
      }));
      
      // Restore selected element if it exists
      setSelectedElement(lastAction.selectedElementId 
        ? lastAction.composition.pages.flatMap((p: any) => p.elements).find((e: any) => e.id === lastAction.selectedElementId) 
        : null
      );
      
      setHasUnsavedChanges(true);
    }
  }, [undoStack, project, selectedElement]);

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const lastUndoneAction = redoStack[redoStack.length - 1];
      
      // Save current state to undo stack
      setUndoStack(prev => [
        ...prev,
        { 
          composition: JSON.parse(JSON.stringify(project.composition)),
          selectedElementId: selectedElement?.id || null
        }
      ]);
      
      // Restore redone state
      setRedoStack(prev => prev.slice(0, -1));
      setProject((prevProject: any) => ({
        ...prevProject,
        composition: lastUndoneAction.composition
      }));
      
      // Restore selected element if it exists
      setSelectedElement(lastUndoneAction.selectedElementId 
        ? lastUndoneAction.composition.pages.flatMap((p: any) => p.elements).find((e: any) => e.id === lastUndoneAction.selectedElementId) 
        : null
      );
      
      setHasUnsavedChanges(true);
    }
  }, [redoStack, project, selectedElement]);

  // Save changes to backend
  const saveChanges = useCallback(async () => {
    if (project && project.composition && hasUnsavedChanges) {
      try {
        await updateProject({
          id: project.id,
          composition: project.composition,
          // Always enable direct JSON editing
          propertiesEnabled: true
        });
        console.log('Project saved successfully');
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to save project:', error);
      }
    }
  }, [project, updateProject, hasUnsavedChanges]);

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z or Ctrl+Z for Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Cmd+Shift+Z or Ctrl+Y for Redo
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
      // Cmd+S or Ctrl+S for Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveChanges();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, saveChanges]);

  const handleElementUpdate = async (elementId: string, updatedData: Partial<CompositionElement>) => {
    if (project && project.composition) {
      // Save current state to history before making changes
      addToHistory(project.composition, elementId);
      
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
        
        // Don't save immediately - we'll batch saves
        setHasUnsavedChanges(true);
      }
    }
  };

  // Auto-save after a period of inactivity
  useEffect(() => {
    const AUTO_SAVE_DELAY = 10000; // 10 seconds
    let autoSaveTimer: NodeJS.Timeout;
    
    if (hasUnsavedChanges) {
      autoSaveTimer = setTimeout(() => {
        console.log('Auto-saving changes...');
        saveChanges();
      }, AUTO_SAVE_DELAY);
    }
    
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [hasUnsavedChanges, saveChanges]);

  // No duplicates here

  useEffect(() => {
    if (project) {
      // Push current state to undo stack
      setUndoStack(prev => [...prev, { composition: project.composition, selectedElementId: selectedElement?.id }]);
      
      // Clear redo stack on new action
      setRedoStack([]);
    }
  }, [project, selectedElement]);

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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Status bar with Save button */}
      <div className="bg-gray-800 text-white p-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold">{project?.name || 'Untitled Project'}</h1>
          <div className="text-sm text-gray-300">
            {hasUnsavedChanges ? '• Unsaved changes' : '• All changes saved'}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo (Cmd+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Undo
          </button>
          <button 
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Cmd+Shift+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Redo
          </button>
          <button 
            className={`px-3 py-1 rounded-md text-sm flex items-center ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 cursor-default'
            }`}
            onClick={saveChanges}
            disabled={!hasUnsavedChanges}
            title="Save (Cmd+S)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Save
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - File Explorer / Elements */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
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
        <div className="flex-1 flex flex-col">
          <MiddlePanel
            project={project}
            selectedElement={selectedElement}
            onTimelineUpdate={handleTimelineUpdate}
            onCompositionUpdate={handleCompositionUpdate}
            onPageSelect={handlePageSelect}
            propertiesEnabled={propertiesEnabled}
          />
        </div>

        {/* Right Panel - Chat UI */}
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
          <RightPanel
            messages={chatMessages}
            onSendMessage={handleChatMessage}
          />
        </div>
      </div>
    </div>
  );
}
