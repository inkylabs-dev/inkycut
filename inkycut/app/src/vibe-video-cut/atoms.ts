import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { CompositionData, CompositionElement, CompositionPage, Project, ChatMessage, AppState } from './components/types';

// UI state atoms
export const loadingAtom = atom<boolean>(false);
export const errorAtom = atom<Error | null>(null);

// Project state atoms
export const projectAtom = atom<Project | null>(null);

// Function to get project from localStorage
export const loadProjectFromStorage = (id: string): Project | null => {
  if (!id || id === 'new') return null;
  
  try {
    const storageKey = `vibe-project-${id}`;
    const storedProject = localStorage.getItem(storageKey);
    
    if (storedProject) {
      return JSON.parse(storedProject);
    }
  } catch (err) {
    console.error('Error loading from localStorage:', err);
  }
  
  return null;
};

// Function to save project to localStorage
export const saveProjectToStorage = (project: Project): void => {
  if (!project || !project.id) return;
  
  try {
    const storageKey = `vibe-project-${project.id}`;
    localStorage.setItem(storageKey, JSON.stringify({
      ...project,
      updatedAt: new Date().toISOString()
    }));
    console.log(`Project ${project.id} saved to localStorage`);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// App state atom - derived from project.appState
export const appStateAtom = atom(
  (get) => get(projectAtom)?.appState || createDefaultAppState()
);

// Selection state atoms - derived from appState
export const selectedElementIdAtom = atom(
  (get) => get(appStateAtom).selectedElementId
);

export const selectedPageIdAtom = atom(
  (get) => get(appStateAtom).selectedPageId
);

// Read-only derived atom for selected element
export const selectedElementAtom = atom<CompositionElement | null>((get) => {
  const project = get(projectAtom);
  const selectedElementId = get(selectedElementIdAtom);
  
  if (!project || !selectedElementId) return null;
  
  // Search through all pages for the element with matching ID
  for (const page of project.composition.pages) {
    const element = page.elements.find(el => el.id === selectedElementId);
    if (element) return element;
  }
  
  return null;
});

// Read-only derived atom for selected page
export const selectedPageAtom = atom<CompositionPage | null>((get) => {
  const project = get(projectAtom);
  const selectedPageId = get(selectedPageIdAtom);
  
  if (!project || !selectedPageId) {
    // Default to first page if no page is selected
    return project?.composition.pages[0] || null;
  }
  
  // Find the page with matching ID
  return project.composition.pages.find(page => page.id === selectedPageId) || null;
});

// Write-only atoms for updating selected element and page
export const setSelectedElementAtom = atom(
  null,
  (get, set, newElement: CompositionElement | null) => {
    const project = get(projectAtom);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        selectedElementId: newElement?.id || null
      }
    };
    
    set(projectAtom, updatedProject);
    saveProjectToStorage(updatedProject);
  }
);

export const setSelectedPageAtom = atom(
  null,
  (get, set, newPage: CompositionPage | null) => {
    const project = get(projectAtom);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        selectedPageId: newPage?.id || null
      }
    };
    
    set(projectAtom, updatedProject);
    saveProjectToStorage(updatedProject);
  }
);

// Chat state atoms
export const chatMessagesAtom = atomWithStorage<ChatMessage[]>('vibe-chat-messages', [
  {
    id: 1,
    role: 'assistant',
    content: 'Welcome to Vibe Video Cut! I\'m your AI assistant. How can I help you create amazing videos today?',
    timestamp: new Date()
  }
]);

// Helper functions for common operations
export const createDefaultPage = (): CompositionPage => {
  return {
    id: `page-${Date.now()}`,
    name: 'Page 1',
    duration: 5 * 30, // 5 seconds at 30fps
    backgroundColor: 'white',
    elements: []
  };
};

// Default app state
export const createDefaultAppState = (): AppState => {
  return {
    selectedElementId: null,
    selectedPageId: null,
    viewMode: 'edit',
    zoomLevel: 1,
    showGrid: true,
    history: {
      past: [],
      future: []
    }
  };
};

export const createDefaultProject = (id: string): Project => {
  const defaultPage = createDefaultPage();
  
  return {
    name: `Vibe Project ${id}`,
    id: id || `project-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    propertiesEnabled: true,
    composition: {
      pages: [defaultPage],
      fps: 30,
      width: 1920,
      height: 1080
    },
    appState: createDefaultAppState()
  };
};

// Derived atoms
export const compositionAtom = atom(
  (get) => get(projectAtom)?.composition || null
);

// Update atoms for specific operations
export const updateElementAtom = atom(
  null,
  (get, set, { elementId, updatedData }: { elementId: string, updatedData: Partial<CompositionElement> }) => {
    const project = get(projectAtom);
    if (!project || !project.composition) return;

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
      // Update project with new composition and maintain selected element
      const updatedProject = {
        ...project,
        composition: updatedComposition,
        updatedAt: new Date().toISOString()
      };
      
      set(projectAtom, updatedProject);
      
      // No need to update selectedElementAtom separately as it's derived from projectAtom
      // and will update automatically through appState.selectedElementId
      
      // Save changes to localStorage
      saveProjectToStorage(updatedProject);
    }
  }
);

export const updateCompositionAtom = atom(
  null,
  (get, set, composition: CompositionData) => {
    const project = get(projectAtom);
    if (!project) return;
    
    // Preserve the current selectedElementId if the element still exists
    const currentSelectedElementId = project.appState.selectedElementId;
    let elementStillExists = false;
    
    if (currentSelectedElementId) {
      // Check if the element still exists in the new composition
      elementStillExists = composition.pages.some(page => 
        page.elements.some(el => el.id === currentSelectedElementId)
      );
    }
    
    // Update project with new composition
    const updatedProject = {
      ...project,
      composition,
      appState: {
        ...project.appState,
        // Clear selectedElementId if element no longer exists
        selectedElementId: elementStillExists ? currentSelectedElementId : null
      },
      updatedAt: new Date().toISOString()
    };
    
    set(projectAtom, updatedProject);
    
    // Save changes to localStorage
    saveProjectToStorage(updatedProject);
  }
);

export const addChatMessageAtom = atom(
  null,
  (get, set, message: string) => {
    const chatMessages = get(chatMessagesAtom);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Simulate AI response
    const aiResponse: ChatMessage = {
      id: chatMessages.length + 2,
      role: 'assistant',
      content: `I received your message: "${message}". This is a mock response. In a real implementation, this would connect to an AI service.`,
      timestamp: new Date()
    };
    
    set(chatMessagesAtom, [...chatMessages, userMessage, aiResponse]);
  }
);

// Generate a random project ID
export const generateRandomId = (): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
