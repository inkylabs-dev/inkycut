import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useAction } from 'wasp/client/operations';
import { getVibeProject, updateVibeProject, createVibeProject } from 'wasp/client/operations';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { CompositionData } from './components/Composition';

export default function VibeVideoCutPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  
  const { data: fetchedProject, isLoading, error } = useQuery(getVibeProject, { id: id! });
  const updateProject = useAction(updateVibeProject);
  const createProject = useAction(createVibeProject);

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
    } else if (!isLoading && !fetchedProject && !error) {
      // Project doesn't exist, create a new one
      const initializeProject = async () => {
        try {
          const newProject = await createProject({
            name: `Vibe Project ${id}`,
            id
          });
          setProject(newProject);
        } catch (err) {
          console.error('Failed to create project:', err);
        }
      };
      initializeProject();
    }
  }, [fetchedProject, isLoading, error, id, createProject]);

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
        const updatedProject = await updateProject({
          id: project.id,
          composition
        });
        setProject(updatedProject);
      } catch (error) {
        console.error('Failed to update composition:', error);
      }
    }
  };

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
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - File Explorer / Elements */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
        <LeftPanel 
          project={project}
          selectedElement={selectedElement}
          selectedPage={selectedPage}
          onElementSelect={handleElementSelect}
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
  );
}
