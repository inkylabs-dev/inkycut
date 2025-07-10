import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Video, interpolate } from 'remotion';

// Utility function to generate unique IDs
const generateUniqueId = (): string => {
  return `el-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Types for our canvas-style JSON model
export interface CompositionElement {
  id?: string; // Now optional, though all elements should ideally have an ID
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
  // Interactive state (for editing)
  isDragging?: boolean;
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

  // Calculate opacity with fade effects
  const opacity = elementWithId.opacity || 1;
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

// Interactive version of Composition that allows for element manipulation

// Interactive version of Composition that allows for element manipulation
export interface InteractiveCompositionProps {
  data: CompositionData;
  currentPageIndex: number;
  onElementSelect: (elementId: string | null) => void;
  onElementChange: (elementId: string, updater: (element: CompositionElement) => CompositionElement) => void;
  selectedElement: string | null;
  editable?: boolean;
}

export const InteractiveComposition: React.FC<InteractiveCompositionProps> = ({ 
  data, 
  currentPageIndex = 0,
  onElementSelect,
  onElementChange,
  selectedElement,
  editable = true
}) => {
  console.log("InteractiveComposition render with:", { selectedElement, editable, currentPageIndex });
  const currentPage = data.pages[currentPageIndex] || data.pages[0];
  
  // Ensure all elements have IDs - run once when the component mounts or page changes
  React.useEffect(() => {
    if (!currentPage) return;
    
    // Process elements that don't have IDs
    currentPage.elements.forEach((element, index) => {
      if (!element.id) {
        const newElementId = generateUniqueId();
        console.debug(`Assigning ID ${newElementId} to element at index ${index}`);
        
        // Use the onElementChange callback to update the element with an ID
        // We create a temporary ID for the callback, since the real ID will be assigned
        onElementChange(`temp-${index}`, (el) => ({
          ...element,
          id: newElementId
        }));
      }
    });
  }, [currentPage, currentPageIndex, onElementChange]);
  const [dragState, setDragState] = React.useState<{
    elementId: string | null;
    isDragging: boolean;
    startX: number;
    startY: number;
    elementStartX: number;
    elementStartY: number;
    isResizing: boolean;
    startWidth: number;
    startHeight: number;
  }>({
    elementId: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    elementStartX: 0,
    elementStartY: 0,
    isResizing: false,
    startWidth: 0,
    startHeight: 0
  });
  
  const handleElementDragStart = (elementId: string, e: React.MouseEvent, isResizing = false) => {
    if (!editable || !elementId) return;
    e.preventDefault(); // Prevent text selection during drag
    
    onElementSelect(elementId);
    
    const element = currentPage.elements.find(el => el.id === elementId);
    if (!element) return;
    
    // Set drag state
    setDragState({
      elementId,
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.x,
      elementStartY: element.y,
      isResizing,
      startWidth: element.width,
      startHeight: element.height
    });
    
    onElementChange(elementId, (element) => ({
      ...element,
      isDragging: true
    }));
  };
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.elementId) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    if (dragState.isResizing) {
      // Resize operation
      const newWidth = Math.max(50, dragState.startWidth + deltaX);
      const newHeight = Math.max(50, dragState.startHeight + deltaY);
      
      onElementChange(dragState.elementId, (element) => ({
        ...element,
        width: newWidth,
        height: newHeight
      }));
    } else {
      // Move operation
      const newX = dragState.elementStartX + deltaX;
      const newY = dragState.elementStartY + deltaY;
      
      onElementChange(dragState.elementId, (element) => ({
        ...element,
        x: newX,
        y: newY
      }));
    }
  }, [dragState, onElementChange]);
  
  const handleMouseUp = React.useCallback(() => {
    if (dragState.isDragging && dragState.elementId) {
      onElementChange(dragState.elementId, (element) => ({
        ...element,
        isDragging: false
      }));
      
      setDragState({
        elementId: null,
        isDragging: false,
        startX: 0,
        startY: 0,
        elementStartX: 0,
        elementStartY: 0,
        isResizing: false,
        startWidth: 0,
        startHeight: 0
      });
    }
  }, [dragState, onElementChange]);
  
  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);
  
  // First, ensure all elements have IDs
  const elementsWithIds = React.useMemo(() => {
    return currentPage.elements.map((element, index) => {
      if (element.id) return element;
      return {
        ...element,
        id: generateUniqueId()
      };
    });
  }, [currentPage.elements]);
  
  // Create an array of renderable elements with explicit keys
  const renderElements = elementsWithIds.map((element, index) => {
    // All elements now have IDs
    const elementKey = `element-${element.id}`;
    
    return (
      <div
        key={elementKey}
        className={`absolute ${selectedElement === element.id ? 'ring-4 ring-blue-500 outline-2 outline-white outline' : ''} ${editable ? 'cursor-move' : ''}`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex || 1,
          opacity: element.opacity !== undefined ? element.opacity : 1,
          transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
          boxShadow: selectedElement === element.id ? '0 0 0 4px rgba(59, 130, 246, 0.5)' : 'none',
        }}
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          console.debug('Element clicked:', element);
          // Now we know element.id always exists
          console.debug('Selecting element with ID:', element.id);
          // Element ID is guaranteed to exist but TS doesn't know that
          onElementSelect(element.id!);
        }}
        onMouseDown={(e) => {
          if (!editable) return;
          e.stopPropagation();
          // Element ID is guaranteed to exist but TS doesn't know that
          handleElementDragStart(element.id!, e);
        }}
      >
        {element.type === 'text' && (
          <div 
            style={{
              fontSize: `${element.fontSize || 16}px`,
              fontFamily: element.fontFamily || 'Arial',
              color: element.color || '#000000',
              fontWeight: element.fontWeight || 'normal',
              textAlign: (element.textAlign as any) || 'left',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.textAlign === 'center' ? 'center' : 
                            element.textAlign === 'right' ? 'flex-end' : 'flex-start',
              userSelect: 'none'
            }}
          >
            {element.text}
          </div>
        )}
        
        {element.type === 'image' && element.src && (
          <img 
            src={element.src} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt={`Element ${element.id || 'unnamed'}`}
            draggable={false}
          />
        )}
        
        {element.type === 'video' && element.src && (
          <video 
            src={element.src}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            muted
            loop
            autoPlay={editable}
          />
        )}
        
        {editable && selectedElement === element.id && element.id && (
          <div 
            className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              if (element.id) {
                handleElementDragStart(element.id, e, true);
              }
            }}
          />
        )}
      </div>
    );
  });

  // Add the background handler with a unique key
  const backgroundHandler = (
    <div 
      key="background-click-handler"
      className="absolute inset-0"
      style={{ zIndex: -1 }}
      onClick={() => {
        console.log('Background clicked, editable:', editable, 'selectedElement:', selectedElement);
        if (editable) {
          console.log('Clearing selection');
          onElementSelect(null);
        }
      }}
    />
  );

  return (
    <div 
      className="relative"
      style={{ 
        width: data.width, 
        height: data.height,
        backgroundColor: currentPage.backgroundColor || '#ffffff',
        overflow: 'hidden'
      }}
    >
      {renderElements}
      {backgroundHandler}
    </div>
  );
};

// Wrapper for InteractiveComposition to use with Remotion Player
export const InteractiveVideoComposition: React.FC<{ 
  data: CompositionData;
  currentPageIndex?: number;
  onElementSelect?: (elementId: string | null) => void;
  onElementChange?: (elementId: string, updater: (element: CompositionElement) => CompositionElement) => void;
  selectedElement?: string | null;
  editable?: boolean;
}> = ({ 
  data, 
  currentPageIndex = 0,
  onElementSelect = () => {},
  onElementChange = () => {},
  selectedElement = null,
  editable = true
}) => {
  // Create a processed copy of the data where all elements have IDs
  const processedData = React.useMemo(() => {
    // Clone the data object to avoid direct mutations
    const newData = {
      ...data,
      pages: data.pages.map(page => ({
        ...page,
        elements: page.elements.map(element => {
          // If the element already has an ID, keep it
          if (element.id) {
            return element;
          }
          // Otherwise, generate a new ID
          return {
            ...element,
            id: generateUniqueId()
          };
        })
      }))
    };
    return newData;
  }, [data]);

  // Create a wrapper for onElementChange to handle the case where an element might not have had an ID initially
  const handleElementChange = React.useCallback((elementId: string, updater: (element: CompositionElement) => CompositionElement) => {
    // Pass through to the original onElementChange
    onElementChange(elementId, updater);
  }, [onElementChange]);
  
  return (
    <InteractiveComposition
      data={processedData}
      currentPageIndex={currentPageIndex}
      onElementSelect={onElementSelect}
      onElementChange={handleElementChange}
      selectedElement={selectedElement}
      editable={editable}
    />
  );
};
