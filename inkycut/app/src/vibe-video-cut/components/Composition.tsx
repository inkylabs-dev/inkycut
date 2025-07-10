/**
 * Composition Component Exports:
 * 
 * 1. MyComposition - The basic original composition (without selection or interaction)
 * 2. VideoComposition - Simple wrapper for MyComposition (for backward compatibility)
 * 3. MainComposition - Enhanced composition with selection outlines and pointer events
 * 4. EnhancedVideoComposition - Wrapper for MainComposition
 */

// Basic composition component
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Video } from 'remotion';
import { CompositionData, CompositionElement, CompositionPage, defaultCompositionData } from './types'; // Adjust the import path as needed
import { SortedOutlines } from './SortedOutline';
import { Layer } from './Layer';

interface CompositionProps {
  data: CompositionData;
  currentPageIndex?: number;
}

// Utility function to generate unique IDs
const generateUniqueId = (): string => {
  return `el-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Individual element renderer
const ElementRenderer: React.FC<{ 
  element: CompositionElement; 
  frame: number; 
  fps: number;
}> = ({ element, frame, fps }) => {
  // Ensure element has an ID
  const elementWithId = React.useMemo(() => {
    if (element.id) return element;
    return {
      ...element,
      id: generateUniqueId()
    };
  }, [element]);
  
  const currentTimeInSeconds = frame / fps;
  
  // Check if element should be visible at current time
  const startTime = elementWithId.startTime || 0;
  const endTime = elementWithId.endTime || Infinity;
  const isVisible = currentTimeInSeconds >= startTime && currentTimeInSeconds <= endTime;
  
  if (!isVisible) return null;

  // Use element opacity directly without animations
  const calculatedOpacity = elementWithId.opacity || 1;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: elementWithId.x,
    top: elementWithId.y,
    width: elementWithId.width,
    height: elementWithId.height,
    transform: `rotate(${elementWithId.rotation || 0}deg)`,
    opacity: calculatedOpacity,
    zIndex: elementWithId.zIndex || 0,
  };

  switch (elementWithId.type) {
    case 'image':
      return elementWithId.src ? (
        <Img
          src={elementWithId.src}
          style={style}
        />
      ) : null;

    case 'video':
      return elementWithId.src ? (
        <Video
          src={elementWithId.src}
          style={style}
          startFrom={Math.floor((currentTimeInSeconds - startTime) * fps)}
        />
      ) : null;

    case 'text':
      return (
        <div
          style={{
            ...style,
            fontSize: elementWithId.fontSize || 24,
            fontFamily: elementWithId.fontFamily || 'Arial, sans-serif',
            color: elementWithId.color || '#000000',
            fontWeight: elementWithId.fontWeight || 'normal',
            textAlign: elementWithId.textAlign || 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: elementWithId.textAlign === 'center' ? 'center' : 
                           elementWithId.textAlign === 'right' ? 'flex-end' : 'flex-start',
            padding: '8px',
            wordWrap: 'break-word',
            overflow: 'hidden',
          }}
        >
          {elementWithId.text || 'Sample Text'}
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
  // Ensure all elements on this page have IDs
  const elementsWithIds = React.useMemo(() => {
    return page.elements.map((element, index) => {
      if (element.id) return element;
      // Assign a new ID if one doesn't exist
      return {
        ...element,
        id: generateUniqueId()
      };
    });
  }, [page.elements]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: page.backgroundColor || '#ffffff' }}>
      {elementsWithIds.map((element, index) => (
        <ElementRenderer
          key={`element-${element.id}`}
          element={element}
          frame={frame}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};

// Enhanced wrapper component with selection and editing capabilities
export const VideoComposition: React.FC<{ 
  data: CompositionData;
  currentPageIndex?: number;
  selectedItem?: string | null;
  setSelectedItem?: (elementId: string | null) => void;
  changeItem?: (elementId: string, updater: (element: CompositionElement) => CompositionElement) => void;
}> = ({ 
  data,
  currentPageIndex = 0,
  selectedItem = null,
  setSelectedItem,
  changeItem,
}) => {
  // Debug the props before passing them
  console.debug("EnhancedVideoComposition passing props:", {
    currentPageIndex,
    selectedItem,
    hasSetSelectedItem: !!setSelectedItem,
    hasChangeItem: !!changeItem
  });

  return (
    <MainComposition 
      data={data}
      currentPageIndex={currentPageIndex}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      changeItem={changeItem}
    />
  );
};



// Main composition component with outlines and pointer event support

// Main composition component with outlines and pointer event support
export const MainComposition: React.FC<{
  data: CompositionData;
  currentPageIndex?: number;
  selectedItem?: string | null;
  setSelectedItem?: (elementId: string | null) => void;
  changeItem?: (elementId: string, updater: (element: CompositionElement) => CompositionElement) => void;
}> = ({ 
  data, 
  currentPageIndex = 0,
  selectedItem = null,
  setSelectedItem = () => {},
  changeItem = () => {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Debug log to see what's happening
  console.debug("MainComposition rendering:", {
    currentPageIndex,
    selectedItem,
    hasSetSelectedItem: !!setSelectedItem,
    hasChangeItem: !!changeItem,
    elementsCount: data.pages[currentPageIndex]?.elements.length || 0
  });
  
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

  // Handle pointer down event to clear selection
  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      // Only handle left mouse button clicks
      if (e.button !== 0 || !setSelectedItem) {
        return;
      }
      
      // Make sure the click was directly on the background
      if (e.currentTarget === e.target) {
        setSelectedItem(null);
      }
    },
    [setSelectedItem],
  );

  // Styles for our layers
  const layerContainer: React.CSSProperties = {
    backgroundColor: currentPage.backgroundColor || '#ffffff',
  };

  // Outer container style
  const outer: React.CSSProperties = {};

  // Process elements to ensure they all have IDs
  const elementsWithIds = currentPage.elements.map(element => {
    if (element.id) return element;
    return { ...element, id: generateUniqueId() };
  });

  return (
    <AbsoluteFill style={outer} onPointerDown={onPointerDown}>
      {/* Base layer with content */}
      <AbsoluteFill style={layerContainer}>
        {/* Only use ElementRenderer for actual content rendering */}
        {elementsWithIds.map((element) => (
          <ElementRenderer
            key={`element-${element.id}`}
            element={element}
            frame={frameOffset}
            fps={fps}
          />
        ))}
      </AbsoluteFill>
      
      {/* Selection outlines and interactive controls overlay */}
      {setSelectedItem && changeItem && (
        <SortedOutlines
          selectedItem={selectedItem}
          items={elementsWithIds}
          setSelectedItem={setSelectedItem}
          changeItem={changeItem}
        />
      )}
    </AbsoluteFill>
  );
};
