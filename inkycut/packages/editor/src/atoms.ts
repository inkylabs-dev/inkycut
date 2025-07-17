import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { CompositionData, CompositionElement, CompositionPage, Project, ChatMessage, AppState, LocalFile } from './types';

/**
 * Primary atom to store the project data with persistence
 * Uses atomWithStorage to automatically save/load project from localStorage
 * @type {Project | null} - The current project or null if no project exists
 */
export const projectAtom = atomWithStorage<Project | null>('vibe-project', null);

/**
 * Write-only atom for updating the project
 * Updates the project's timestamp before storing
 * @param {Project | null} updatedProject - The project to update or null to clear
 */
export const updateProjectAtom = atom(
  null,
  (_, set, updatedProject: Project | null) => {
    if (!updatedProject) {
      // If clearing the project, just set null
      set(projectAtom, null);
      return;
    }
    
    // Update the timestamp before storing
    const projectWithUpdatedTimestamp = {
      ...updatedProject,
      updatedAt: new Date().toISOString()
    };
    
    // Update the project in storage
    set(projectAtom, projectWithUpdatedTimestamp);
    
    // Log successful save
    console.log(`Project saved to storage`);
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
  for (const page of project.composition?.pages || []) {
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
  
  if (!project || !project.composition) return null;
  
  if (!selectedPageId) {
    // Default to first page if no page is selected
    return project.composition.pages?.[0] || null;
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
        ...project.appState || {},
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
        ...project.appState || {},
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
 * Atom for loading state to track application loading states
 * This is now separated from the project to avoid circular dependencies
 * @type {boolean} - Whether the application is currently loading data
 */
export const loadingAtom = atom<boolean>(false);

/**
 * Write-only atom for updating the loading state
 * @param {boolean} isLoading - The new loading state
 */
export const setLoadingAtom = atom(
  null,
  (_, set, isLoading: boolean) => {
    set(loadingAtom, isLoading);
  }
);

/**
 * Atom for error state to track application errors
 * This is now separated from the project to avoid circular dependencies
 * @type {Error | null} - Current error or null if no error
 */
export const errorAtom = atom<Error | null>(null);

/**
 * Write-only atom for updating the error state
 * @param {Error | null} error - The new error or null to clear errors
 */
export const setErrorAtom = atom(
  null,
  (_, set, error: Error | null) => {
    set(errorAtom, error);
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
 * @param {string} [name='My Project'] - Optional name for the project
 * @returns {Project} - A fully initialized project ready to use
 */
export const createDefaultProject = (name: string = 'My Project'): Project => {
  const defaultPage = createDefaultPage();
  const timestamp = Date.now();
  const id = `project-${timestamp}`;
  
  return {
    name: name || 'Vibe Project',
    id: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    propertiesEnabled: true,
    composition: {
      pages: [defaultPage],
      fps: 30,
      width: 1920,
      height: 1080
    },
    appState: createDefaultAppState(),
    files: []
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
    const updatedComposition = ensureCompositionIDs(JSON.parse(JSON.stringify(project.composition)) as CompositionData);
    
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
    
    // Ensure all pages and elements have IDs before updating
    const compositionWithIDs = ensureCompositionIDs(composition);
    
    // Preserve the current selectedElementId if the element still exists
    const currentSelectedElementId = project.appState?.selectedElementId;
    let elementStillExists = false;
    
    if (currentSelectedElementId) {
      // Check if the element still exists in the new composition
      elementStillExists = compositionWithIDs.pages.some(page => 
        page.elements.some(el => el.id === currentSelectedElementId)
      );
    }
    
    // Update project with new composition
    const updatedProject = {
      ...project,
      composition: compositionWithIDs,
      appState: {
        ...project.appState || {},
        // Clear selectedElementId if element no longer exists
        selectedElementId: elementStillExists ? currentSelectedElementId : null
      }
    };
    
    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);

/**
 * Utility function to ensure all pages and elements have valid IDs
 * This prevents JSON parsing errors when saving projects
 * @param {CompositionData} composition - The composition data to validate
 * @returns {CompositionData} - The composition with ensured IDs
 */
export const ensureCompositionIDs = (composition: CompositionData): CompositionData => {
  return {
    ...composition,
    pages: composition.pages.map((page, pageIndex) => {
      // Ensure page has an ID
      const pageId = page.id || `page-${Date.now()}-${pageIndex}`;
      
      return {
        ...page,
        id: pageId,
        elements: page.elements.map((element, elementIndex) => {
          // Ensure element has an ID
          const elementId = element.id || `element-${Date.now()}-${pageIndex}-${elementIndex}`;
          
          return {
            ...element,
            id: elementId
          };
        })
      };
    })
  };
};

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
        id: Date.now(), // Use timestamp for unique IDs
        role: 'user', // Default to user role when string is provided
        content: messageOrContent,
        timestamp: new Date().toISOString() // Store as ISO string for localStorage compatibility
      };
    } else {
      // Use the provided message object directly, ensuring it has all required fields
      newMessage = {
        ...messageOrContent,
        // Ensure timestamp is ISO string for localStorage compatibility
        timestamp: messageOrContent.timestamp || new Date().toISOString()
      };
    }
    
    // Add only the single message to the chat history
    set(chatMessagesAtom, [...chatMessages, newMessage]);
  }
);

/**
 * Derived atom providing the files array from the current project
 * @type {LocalFile[]} - Array of local files or empty array if no project
 */
export const filesAtom = atom(
  (get) => get(projectAtom)?.files || []
);

/**
 * Write-only atom for adding a new local file to the project
 * Converts File object to LocalFile with data URL and stores it
 * @param {File} file - The File object to add to the project
 */
export const addFileAtom = atom(
  null,
  async (get, set, file: File) => {
    const project = get(projectAtom);
    if (!project) return;

    // Convert file to data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create LocalFile object
    const localFile: LocalFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    // Add file to project
    const updatedProject = {
      ...project,
      files: [...project.files, localFile]
    };

    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
    
    return localFile;
  }
);

/**
 * Write-only atom for removing a file from the project
 * @param {string} fileId - The ID of the file to remove
 */
export const removeFileAtom = atom(
  null,
  (get, set, fileId: string) => {
    const project = get(projectAtom);
    if (!project) return;

    // Remove file from project
    const updatedProject = {
      ...project,
      files: project.files.filter(file => file.id !== fileId)
    };

    // Use updateProjectAtom to update the project in storage
    set(updateProjectAtom, updatedProject);
  }
);
