/**
 * CompositionElement represents a visual element in the composition
 * Elements can be videos, images, or text that are positioned and styled
 * within the composition timeline.
 */
export interface CompositionElement {
  /** Unique identifier for the element */
  id: string; 
  /** Type of element: video, image, or text */
  type: 'video' | 'image' | 'text';
  /** X position from left edge (in pixels) */
  left: number;
  /** Y position from top edge (in pixels) */
  top: number;
  /** Element width in pixels */
  width: number;
  /** Element height in pixels */
  height: number;
  /** Rotation angle in degrees (clockwise) */
  rotation?: number;
  /** Opacity value from 0 (transparent) to 1 (fully visible) */
  opacity?: number;
  /** Stack order - higher values appear above lower values */
  zIndex?: number;
  /** Time when element appears in the composition (in seconds) */
  startTime?: number;
  /** Time when element disappears (in seconds) */
  endTime?: number;
  
  // Video/Image specific properties
  /** Source URL for video or image elements */
  src?: string;
  
  // Text specific properties
  /** Content of a text element */
  text?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family name */
  fontFamily?: string;
  /** Text color in CSS format (hex, rgba, etc.) */
  color?: string;
  /** Font weight (bold, normal, etc.) */
  fontWeight?: string;
  /** Horizontal text alignment */
  textAlign?: 'left' | 'center' | 'right';
  
  // Interactive state (for editing)
  /** Whether element is currently being dragged by user */
  isDragging?: boolean;
}

/**
 * Props for ElementRenderer component
 * These props are passed to the renderer to display elements at a specific point in time
 */
export interface ElementRendererProps {
  /** The element to render */
  element: CompositionElement;
  /** Current frame number in the timeline */
  frame: number;
  /** Frames per second of the composition */
  fps: number;
}

/**
 * CompositionPage represents a distinct section/scene in the composition
 * Each page contains its own set of elements and duration
 */
export interface CompositionPage {
  /** Unique identifier for the page */
  id: string;
  /** User-friendly name for the page */
  name: string;
  /** Duration of the page in frames */
  duration: number;
  /** Background color of the page (CSS color value) */
  backgroundColor?: string;
  /** Array of elements that appear on this page */
  elements: CompositionElement[];
}

/**
 * CompositionData represents the entire video composition
 * Contains all pages and global settings for the video
 */
export interface CompositionData {
  /** Array of all pages in the composition */
  pages: CompositionPage[];
  /** Frames per second for the entire composition */
  fps: number;
  /** Width of the composition canvas in pixels */
  width: number;
  /** Height of the composition canvas in pixels */
  height: number;
}

/**
 * AppState interface represents the UI state of the application
 * This includes UI preferences, selections, and transient states
 */
export interface AppState {
  /** ID of the currently selected element (if any) */
  selectedElementId: string | null;
  /** ID of the currently selected page (if any) */
  selectedPageId: string | null;
  /** Current view mode: edit or preview */
  viewMode: 'edit' | 'preview';
  /** Current zoom level of the canvas (1 = 100%) */
  zoomLevel: number;
  /** Whether to show the alignment grid */
  showGrid: boolean;
  /** Whether the app is currently loading data */
  isLoading: boolean;
  /** Error message if there's a problem, null if no errors */
  error: string | null;
  /** Undo/redo history for the project */
  history: {
    /** Past states for undo operations */
    past: any[];
    /** Future states for redo operations */
    future: any[];
  };
  /** Additional state properties can be added as needed */
  [key: string]: any; // Allow for extension
}

/**
 * Project represents a complete video editing project
 * Combines composition data with application state and metadata
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;
  /** User-assigned name of the project */
  name: string;
  /** ISO timestamp when the project was created */
  createdAt: string;
  /** ISO timestamp when the project was last updated */
  updatedAt: string;
  /** Whether properties panel is enabled for this project */
  propertiesEnabled: boolean;
  /** The actual video composition data */
  composition: CompositionData;
  /** Current application state for this project */
  appState: AppState;
  /** Optional additional metadata for the project */
  metadata?: {
    /** Timeline-specific data for rendering */
    timeline?: any[];
    /** Additional metadata fields as needed */
    [key: string]: any;
  };
}

/**
 * ChatMessage represents a single message in the AI chat interface
 * Used for the AI assistant feature in the editor
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: number;
  /** Who sent the message: user or AI assistant */
  role: 'user' | 'assistant';
  /** The actual text content of the message */
  content: string;
  /** When the message was sent - can be Date object or ISO string */
  timestamp: Date | string;
}

/**
 * Default composition data for testing and creating new projects
 * Provides a sample three-page project with intro, content, and outro sections
 */
export const defaultCompositionData: CompositionData = {
  fps: 30,
  width: 1920,
  height: 1080,
  pages: [
    {
      id: 'page1',
      name: 'Intro',
      duration: 150, // 5 seconds at 30fps
      backgroundColor: '#1e3a8a',
      elements: [
        {
          id: 'text1',
          type: 'text',
          left: 100,
          top: 200,
          width: 800,
          height: 100,
          text: 'Welcome to InkyCut',
          fontSize: 48,
          color: '#ffffff',
          fontWeight: 'bold',
          textAlign: 'center',
          startTime: 0,
          endTime: 5,
        },
        {
          id: 'text2',
          type: 'text',
          left: 100,
          top: 350,
          width: 800,
          height: 60,
          text: 'Create amazing videos with vibe filming!',
          fontSize: 24,
          color: '#e5e7eb',
          textAlign: 'center',
          startTime: 1,
          endTime: 5,
        }
      ]
    },
    {
      id: 'page2',
      name: 'Content',
      duration: 180, // 6 seconds at 30fps
      backgroundColor: '#059669',
      elements: [
        {
          id: 'text3',
          type: 'text',
          left: 100,
          top: 100,
          width: 600,
          height: 80,
          text: 'Page 2: Main Content',
          fontSize: 36,
          color: '#ffffff',
          fontWeight: 'bold',
          startTime: 0,
          endTime: 6,
        },
        {
          id: 'text4',
          type: 'text',
          left: 100,
          top: 250,
          width: 800,
          height: 200,
          text: 'This is where your main content goes. You can add images, videos, and text elements to create engaging stories.',
          fontSize: 20,
          color: '#f3f4f6',
          startTime: 1,
          endTime: 6,
        }
      ]
    },
    {
      id: 'page3',
      name: 'Outro',
      duration: 120, // 4 seconds at 30fps
      backgroundColor: '#7c3aed',
      elements: [
        {
          id: 'text5',
          type: 'text',
          left: 100,
          top: 250,
          width: 800,
          height: 100,
          text: 'Thanks for watching!',
          fontSize: 42,
          color: '#ffffff',
          fontWeight: 'bold',
          textAlign: 'center',
          startTime: 0,
          endTime: 4,
        }
      ]
    }
  ]
};
