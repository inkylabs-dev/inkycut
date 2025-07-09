import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Video, interpolate } from 'remotion';

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
  // Video/Image specific
  src?: string;
  startTime?: number;
  endTime?: number;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
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

interface CompositionProps {
  data: CompositionData;
  currentPageIndex?: number;
}

// Individual element renderer
const ElementRenderer: React.FC<{ 
  element: CompositionElement; 
  frame: number; 
  fps: number;
}> = ({ element, frame, fps }) => {
  const currentTimeInSeconds = frame / fps;
  
  // Check if element should be visible at current time
  const startTime = element.startTime || 0;
  const endTime = element.endTime || Infinity;
  const isVisible = currentTimeInSeconds >= startTime && currentTimeInSeconds <= endTime;
  
  if (!isVisible) return null;

  // Calculate opacity with fade effects
  const opacity = element.opacity || 1;
  const fadeInDuration = 0.5; // 0.5 seconds fade in
  const fadeOutDuration = 0.5; // 0.5 seconds fade out
  
  let calculatedOpacity = opacity;
  
  if (currentTimeInSeconds < startTime + fadeInDuration) {
    calculatedOpacity *= interpolate(
      currentTimeInSeconds,
      [startTime, startTime + fadeInDuration],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  if (endTime !== Infinity && currentTimeInSeconds > endTime - fadeOutDuration) {
    calculatedOpacity *= interpolate(
      currentTimeInSeconds,
      [endTime - fadeOutDuration, endTime],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    opacity: calculatedOpacity,
    zIndex: element.zIndex || 0,
  };

  switch (element.type) {
    case 'image':
      return element.src ? (
        <Img
          src={element.src}
          style={style}
        />
      ) : null;

    case 'video':
      return element.src ? (
        <Video
          src={element.src}
          style={style}
          startFrom={Math.floor((currentTimeInSeconds - startTime) * fps)}
        />
      ) : null;

    case 'text':
      return (
        <div
          style={{
            ...style,
            fontSize: element.fontSize || 24,
            fontFamily: element.fontFamily || 'Arial, sans-serif',
            color: element.color || '#000000',
            fontWeight: element.fontWeight || 'normal',
            textAlign: element.textAlign || 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: element.textAlign === 'center' ? 'center' : 
                           element.textAlign === 'right' ? 'flex-end' : 'flex-start',
            padding: '8px',
            wordWrap: 'break-word',
            overflow: 'hidden',
          }}
        >
          {element.text || 'Sample Text'}
        </div>
      );

    default:
      return null;
  }
};

// Page renderer
const PageRenderer: React.FC<{ 
  page: CompositionPage; 
  frame: number; 
  fps: number;
}> = ({ page, frame, fps }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: page.backgroundColor || '#ffffff' }}>
      {page.elements.map((element) => (
        <ElementRenderer
          key={element.id}
          element={element}
          frame={frame}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};

// Main composition component
export const MyComposition: React.FC<CompositionProps> = ({ 
  data, 
  currentPageIndex = 0 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate which page should be shown based on frame
  let pageIndex = currentPageIndex;
  let frameOffset = 0;
  
  if (currentPageIndex === undefined) {
    // Auto-calculate page based on cumulative duration
    let cumulativeFrames = 0;
    for (let i = 0; i < data.pages.length; i++) {
      if (frame < cumulativeFrames + data.pages[i].duration) {
        pageIndex = i;
        frameOffset = frame - cumulativeFrames;
        break;
      }
      cumulativeFrames += data.pages[i].duration;
    }
  } else {
    frameOffset = frame;
  }
  
  const currentPage = data.pages[pageIndex];
  
  if (!currentPage) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000000' }}>
        <div style={{ 
          color: 'white', 
          fontSize: 24, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%' 
        }}>
          No page found
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <PageRenderer
      page={currentPage}
      frame={frameOffset}
      fps={fps}
    />
  );
};

// Wrapper component for Player compatibility
export const VideoComposition: React.FC<{ data: CompositionData }> = ({ data }) => {
  return <MyComposition data={data} />;
};

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
