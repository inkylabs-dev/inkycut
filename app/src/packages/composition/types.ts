/**
 * CompositionElement represents a visual element in the composition
 * Elements can be videos, images, or text that are positioned and styled
 * within the composition timeline.
 */
export interface CompositionElement {
  /** Unique identifier for the element */
  id: string; 
  /** Type of element: video, image, text, or group */
  type: 'video' | 'image' | 'text' | 'group';
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
  /** Delay before element appears in the composition (in frames) */
  delay?: number;
  
  // Video/Image specific properties
  /** Source URL for video or image elements */
  src?: string;
  
  // Group specific properties
  /** Child elements for group elements (positioned relative to group) */
  elements?: CompositionElement[];
  
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
  
  // Animation properties
  /** Animation configuration compatible with anime.js */
  animation?: {
    /** Animation parameters compatible with anime.js. It
     * can be css properties, css transforms, css variables, 
     */
    props?: Record<string, any>;
    /** Animation duration in frames */
    duration?: number;
    /** Animation easing function */
    ease?: string;
    /** Animation delay in frames */
    delay?: number;
    /** Animation direction */
    alternate?: boolean;
    /** Animation loop settings */
    loop?: boolean | number;
    /** Auto-play animation */
    autoplay?: boolean;
  };
  
  // Methods for dynamic dimension calculation
  /** Get the effective width of the element (may differ from width property for groups) */
  getWidth?(): number;
  /** Get the effective height of the element (may differ from height property for groups) */
  getHeight?(): number;
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
  /** Audio tracks in the composition */
  audios?: CompositionAudio[];
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
  /** Currently dragged file during drag and drop operations */
  draggedFile?: LocalFile | null;
  /** Additional state properties can be added as needed */
  [key: string]: any; // Allow for extension
}

/**
 * LocalFile represents a file stored locally in the project
 * Files are stored as data URLs (base64 encoded)
 */
export interface LocalFile {
  /** Unique identifier for the file */
  id: string;
  /** Original filename */
  name: string;
  /** MIME type of the file */
  type: string;
  /** File size in bytes */
  size: number;
  /** Data URL containing the file content (data:mime/type;base64,data) */
  dataUrl: string;
  /** Blob representation of the file (for audio conversion) */
  blob?: Blob;
  /** Timestamp when file was added */
  createdAt: string;
  /** Timestamp when file was last updated */
  updatedAt?: string;
  /** Width in pixels (for images and videos) */
  width?: number;
  /** Height in pixels (for images and videos) */
  height?: number;
  /** Duration in frames (for videos) */
  duration?: number;
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
  /** Local files stored in the project (no server uploads) */
  files: LocalFile[];
  /** Optional additional metadata for the project */
  metadata?: {
    /** Timeline-specific data for rendering */
    timeline?: any[];
    /** Additional metadata fields as needed */
    [key: string]: any;
  };
}

/**
 * CompositionAudio represents an audio track in the composition
 * Audio tracks can be background music, sound effects, or voiceovers
 */
export interface CompositionAudio {
  /** Unique identifier for the audio track */
  id: string;
  /** Source URL for the audio file */
  src: string;
  /** Volume level from 0 (silent) to 1 (full volume) */
  volume: number;
  /** Time in frames to trim from the beginning of the audio */
  trimBefore: number;
  /** Time in frames to trim from the end of the audio */
  trimAfter: number;
  /** Playback speed multiplier (1 = normal speed, 2 = double speed, 0.5 = half speed) */
  playbackRate: number;
  /** Whether the audio track is muted */
  muted: boolean;
  /** Whether the audio should loop continuously */
  loop: boolean;
  /** Tone frequency adjustment from 0.01 to 2 (1 = normal pitch) */
  toneFrequency: number;
  /** Delay before audio starts playing in frames */
  delay: number;
  /** Duration of the audio track in frames */
  duration: number;
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

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
          delay: 0,
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
          delay: 30, // 1 second at 30fps
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
          delay: 0,
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
          delay: 1000,
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
          delay: 0,
        }
      ]
    }
  ]
};

// Note: draggedFile is now stored in project.appState instead of window
