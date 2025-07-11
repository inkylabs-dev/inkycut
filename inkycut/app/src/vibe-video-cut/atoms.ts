import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { CompositionData, CompositionElement, CompositionPage, Project, ChatMessage, AppState } from './components/types';

/**
 * Primary atom to track the currently active project ID
 * When this ID changes, projectAtom will load the corresponding project
 * @type {string | null} - The ID of the current project, or null if no project is active
 */
export const projectIdAtom = atom<string | null>(null);

/**
 * Persistent storage for all projects using atomWithStorage
 * Stores projects in localStorage as a map keyed by project ID
 * @type {Record<string, Project>} - Map of project IDs to Project objects
 */
export const projectsMapAtom = atomWithStorage<Record<string, Project>>('vibe-projects', {});

/**
 * Utility atom that returns a function to get a project by its ID
 * @returns {Function} - Function that takes a project ID and returns the corresponding Project or null
 */
export const getProjectById = atom(
  (get) => (id: string) => {
    if (!id || id === 'new') return null;
    const projectsMap = get(projectsMapAtom);
    return projectsMap[id] || null;
  }
);

/**
 * Derived atom that provides the currently active project
 * Uses projectIdAtom to determine which project to load from projectsMapAtom
 * @type {Project | null} - The current project or null if no project is active
 */
export const projectAtom = atom<Project | null>(
  (get) => {
    const projectId = get(projectIdAtom);
    const getProject = get(getProjectById);
    
    if (!projectId) return null;
    return getProject(projectId);
  }
);

/**
 * Write-only atom for updating a project in storage
 * Updates the project's timestamp, saves it to the projects map, and sets the current project ID
 * @param {Project | null} updatedProject - The project to update or null to clear
 */
export const updateProjectAtom = atom(
  null,
  (get, set, updatedProject: Project | null) => {
    if (!updatedProject) {
      // If clearing the project, don't update storage
      return;
    }
    
    // Set the project ID atom to the current project
    set(projectIdAtom, updatedProject.id);
    
    // Update the timestamp before storing
    const projectWithUpdatedTimestamp = {
      ...updatedProject,
      updatedAt: new Date().toISOString()
    };
    
    // Update the project in the map
    const projectsMap = get(projectsMapAtom);
    set(projectsMapAtom, {
      ...projectsMap,
      [updatedProject.id]: projectWithUpdatedTimestamp
    });
    
    // Log successful save
    console.log(`Project ${updatedProject.id} saved to storage`);
  }
);

/**
 * Derived atom providing the current application state
 * Falls back to default app state if no project is active
 * @type {AppState} - The current app state for the active project
 */
export const appStateAtom = atom(
  (get) => get(projectAtom)?.appState || createDefaultAppState()
);

/**
 * Derived atom for the ID of the currently selected element
 * @type {string | null} - ID of selected element or null if none selected
 */
export const selectedElementIdAtom = atom(
  (get) => get(appStateAtom).selectedElementId
);

/**
 * Derived atom for the ID of the currently selected page
 * @type {string | null} - ID of selected page or null if none selected
 */
export const selectedPageIdAtom = atom(
  (get) => get(appStateAtom).selectedPageId
);

/**
 * Read-only derived atom that provides the currently selected element
 * Searches through all pages to find the element with the selected ID
 * @type {CompositionElement | null} - The selected element object or null
 */
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

/**
 * Read-only derived atom that provides the currently selected page
 * Falls back to the first page if no page is explicitly selected
 * @type {CompositionPage | null} - The selected page object or null
 */
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

/**
 * Write-only atom for selecting an element
 * Updates the project's appState.selectedElementId and persists the change
 * @param {CompositionElement | null} newElement - The element to select, or null to clear selection
 */
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
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Write-only atom for selecting a page
 * Updates the project's appState.selectedPageId and persists the change
 * @param {CompositionPage | null} newPage - The page to select, or null to clear selection
 */
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
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Persistent storage for chat messages using atomWithStorage
 * Stores the entire chat history in localStorage
 * @type {ChatMessage[]} - Array of chat messages with initial welcome message
 */
export const chatMessagesAtom = atomWithStorage<ChatMessage[]>('vibe-chat-messages', [
  {
    id: 1,
    role: 'assistant',
    content: 'Welcome to Vibe Video Cut! I\'m your AI assistant. How can I help you create amazing videos today?',
    timestamp: new Date().toISOString() // Store as ISO string for localStorage compatibility
  }
]);

/**
 * Read-only derived atom for loading state
 * Extracted from project.appState.isLoading with fallback to false
 * @type {boolean} - Whether the application is currently loading data
 */
export const loadingAtom = atom<boolean>(
  (get) => {
    const project = get(projectAtom);
    return project?.appState?.isLoading ?? false;
  }
);

/**
 * Write-only atom for updating the loading state
 * Updates project.appState.isLoading and persists the change
 * @param {boolean} isLoading - The new loading state
 */
export const setLoadingAtom = atom(
  null,
  (get, set, isLoading: boolean) => {
    const project = get(projectAtom);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        isLoading
      }
    };
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Read-only derived atom for error state
 * Converts project.appState.error string to Error object if present
 * @type {Error | null} - Current error or null if no error
 */
export const errorAtom = atom<Error | null>(
  (get) => {
    const project = get(projectAtom);
    const errorMessage = project?.appState?.error;
    return errorMessage ? new Error(errorMessage) : null;
  }
);

/**
 * Write-only atom for updating the error state
 * Updates project.appState.error with the error message and persists the change
 * @param {Error | null} error - The new error or null to clear errors
 */
export const setErrorAtom = atom(
  null,
  (get, set, error: Error | null) => {
    const project = get(projectAtom);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        error: error?.message || null
      }
    };
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Helper function to create a default composition page
 * Used when initializing new projects or adding pages
 * @returns {CompositionPage} - A new page with default settings
 */
export const createDefaultPage = (): CompositionPage => {
  return {
    id: `page-${Date.now()}`,
    name: 'Page 1',
    duration: 5 * 30, // 5 seconds at 30fps
    backgroundColor: 'white',
    elements: []
  };
};

/**
 * Creates a default application state
 * Used when initializing new projects or resetting state
 * @returns {AppState} - A new app state with default settings
 */
export const createDefaultAppState = (): AppState => {
  return {
    selectedElementId: null,
    selectedPageId: null,
    viewMode: 'edit',
    zoomLevel: 1,
    showGrid: true,
    isLoading: false,
    error: null,
    history: {
      past: [],
      future: []
    }
  };
};

/**
 * Creates a new project with default settings
 * Includes a default page, composition settings, and app state
 * @param {string} id - The ID to use for the new project
 * @returns {Project} - A fully initialized project ready to use
 */
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

/**
 * Derived atom providing the composition data for the current project
 * @type {CompositionData | null} - Composition data or null if no project is active
 */
export const compositionAtom = atom(
  (get) => get(projectAtom)?.composition || null
);

/**
 * Write-only atom for updating a specific element
 * Finds the element across all pages and updates it with new properties
 * @param {Object} params - The update parameters
 * @param {string} params.elementId - ID of the element to update
 * @param {Partial<CompositionElement>} params.updatedData - New properties to apply
 */
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
        composition: updatedComposition
      };
      
      // Use updateProjectAtom to update the project in storage
      set(updateProjectAtom, updatedProject);
    }
  }
);

/**
 * Write-only atom for updating the entire composition
 * Preserves selection state if possible or clears it if selected elements no longer exist
 * @param {CompositionData} composition - The new composition data
 */
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
      }
    };
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Write-only atom for adding a new chat message
 * Adds a single message (either from user or AI) to the chat history
 * @param {string | ChatMessage} messageOrContent - The message content as string or complete ChatMessage object
 */
export const addChatMessageAtom = atom(
  null,
  (get, set, messageOrContent: string | ChatMessage) => {
    const chatMessages = get(chatMessagesAtom);
    
    let newMessage: ChatMessage;
    
    if (typeof messageOrContent === 'string') {
      // Create a new message with the provided content
      newMessage = {
        id: chatMessages.length + 1,
        role: 'user', // Default to user role when string is provided
        content: messageOrContent,
        timestamp: new Date().toISOString() // Store as ISO string for localStorage compatibility
      };
    } else {
      // Use the provided message object directly
      newMessage = messageOrContent;
    }
    
    // Add only the single message to the chat history
    set(chatMessagesAtom, [...chatMessages, newMessage]);
  }
);

/**
 * Generates a cryptographically non-secure random ID
 * Used for creating new project IDs, page IDs, and element IDs
 * @returns {string} - A 32-character random alphanumeric string
 */
export const generateRandomId = (): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
