// Types for our canvas-style JSON model
export interface CompositionElement {
  id: string; 
  type: 'video' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  startTime?: number;
  endTime?: number;
  // Video/Image specific
  src?: string;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  // Interactive state (for editing)
  isDragging?: boolean;
}

// Props for ElementRenderer component
export interface ElementRendererProps {
  element: CompositionElement;
  frame: number;
  fps: number;
}

export interface CompositionPage {
  id: string;
  name: string;
  duration: number; // Duration in frames
  backgroundColor?: string;
  elements: CompositionElement[];
}

export interface CompositionData {
  pages: CompositionPage[];
  fps: number;
  width: number;
  height: number;
}

// Default composition data for testing
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
          x: 100,
          y: 200,
          width: 800,
          height: 100,
          text: 'Welcome to Vibe Video Cut',
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
          x: 100,
          y: 350,
          width: 800,
          height: 60,
          text: 'Create amazing videos with ease',
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
          x: 100,
          y: 100,
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
          x: 100,
          y: 250,
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
          x: 100,
          y: 250,
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