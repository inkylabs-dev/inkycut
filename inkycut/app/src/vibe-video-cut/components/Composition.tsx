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
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Video, Sequence } from 'remotion';
import { CompositionData, CompositionElement, CompositionPage, ElementRendererProps, defaultCompositionData, LocalFile } from './types'; // Adjust the import path as needed
import { Layer } from './Layer';
import { FileResolver, createFileResolver } from '../utils/fileResolver';

interface CompositionProps {
  data: CompositionData;
  currentPageIndex?: number;
  files?: LocalFile[];
}

// Utility function to generate unique IDs
const generateUniqueId = (): string => {
  return `el-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Individual element renderer
const ElementRenderer: React.FC<ElementRendererProps & { fileResolver?: FileResolver }> = ({ element, frame, fps, fileResolver }) => {
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
    left: elementWithId.left,
    top: elementWithId.top,
    width: elementWithId.width,
    height: elementWithId.height,
    transform: `rotate(${elementWithId.rotation || 0}deg)`,
    opacity: calculatedOpacity,
    zIndex: elementWithId.zIndex || 0,
  };

  // Resolve file sources using the file resolver
  const resolvedSrc = elementWithId.src && fileResolver ? fileResolver.resolve(elementWithId.src) : elementWithId.src;

  switch (elementWithId.type) {
    case 'image':
      return resolvedSrc ? (
        <Img
          src={resolvedSrc}
          style={style}
        />
      ) : null;

    case 'video':
      return resolvedSrc ? (
        <Video
          src={resolvedSrc}
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
  fileResolver?: FileResolver;
}> = ({ page, frame, fps, fileResolver }) => {
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
        <Layer
          key={`element-${element.id}`}
          element={element}
          frame={frame}
          fps={fps}
        >
          <ElementRenderer
            element={element}
            frame={frame}
            fps={fps}
            fileResolver={fileResolver}
          />
        </Layer>
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
  files?: LocalFile[];
}> = ({ 
  data,
  currentPageIndex,
  files,
}) => {
  return (
    <MainComposition 
      data={data}
      currentPageIndex={currentPageIndex}
      files={files}
    />
  );
};



// Main composition component with outlines and pointer event support

// Main composition component with outlines and pointer event support
export const MainComposition: React.FC<{
  data: CompositionData;
  currentPageIndex?: number;
  files?: LocalFile[];
}> = ({ 
  data, 
  currentPageIndex,
  files,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Create file resolver from local files
  const fileResolver = React.useMemo(() => {
    return files ? createFileResolver(files) : undefined;
  }, [files]);
  
  // Outer container style
  const outer: React.CSSProperties = {};
  
  // When in editing mode (with a specific currentPageIndex), render only that page
  if (currentPageIndex !== undefined) {
    const currentPage = data.pages[currentPageIndex];
    
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
    
    // Styles for our layers
    const layerContainer: React.CSSProperties = {
      backgroundColor: currentPage.backgroundColor || '#ffffff',
    };

    // Process elements to ensure they all have IDs
    const elementsWithIds = currentPage.elements.map(element => {
      if (element.id) return element;
      return { ...element, id: generateUniqueId() };
    });

    return (
      <AbsoluteFill style={outer}>
        {/* Base layer with content */}
        <AbsoluteFill style={layerContainer}>
          {/* Wrap ElementRenderer with Layer for proper time-based sequencing */}
          {elementsWithIds.map((element) => (
            <Layer
              key={`element-${element.id}`}
              element={element}
              frame={frame}
              fps={fps}
            >
              <ElementRenderer
                element={element}
                frame={frame}
                fps={fps}
                fileResolver={fileResolver}
              />
            </Layer>
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  
  // When rendering the full video, wrap each page in a Sequence
  // Calculate the frame durations for each page
  // Handle missing or invalid data
  if (!data || !data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff0000' }}>
        <div style={{ 
          color: 'white', 
          fontSize: 24, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%' 
        }}>
          Error: No pages data available. Data: {JSON.stringify(data)}
        </div>
      </AbsoluteFill>
    );
  }

  const pageDurations = data.pages.map(page => page.duration || 0);
  let cumulativeFrames = 0;
  
  
  return (
    <AbsoluteFill style={outer}>
      {data.pages.map((page, index) => {
        // Calculate the start frame for this page
        const startFrame = cumulativeFrames;
        cumulativeFrames += pageDurations[index];
        
        // Process elements to ensure they all have IDs
        const elementsWithIds = page.elements.map(element => {
          if (element.id) return element;
          return { ...element, id: generateUniqueId() };
        });
        
        return (
          <Sequence
            key={`page-${index}`}
            from={startFrame}
            durationInFrames={pageDurations[index]}
          >
            <AbsoluteFill style={{ backgroundColor: page.backgroundColor || '#ffffff' }}>
              {elementsWithIds.map((element) => (
                <Layer
                  key={`element-${element.id}`}
                  element={element}
                  frame={frame - startFrame}
                  fps={fps}
                >
                  <ElementRenderer
                    element={element}
                    frame={frame - startFrame}
                    fps={fps}
                    fileResolver={fileResolver}
                  />
                </Layer>
              ))}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
