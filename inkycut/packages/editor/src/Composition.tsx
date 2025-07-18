/**
 * Composition Component Exports:
 * 
 * 1. MyComposition - The basic original composition (without selection or interaction)
 * 2. VideoComposition - Simple wrapper for MyComposition (for backward compatibility)
 * 3. MainComposition - Enhanced composition with selection outlines and pointer events
 * 4. EnhancedVideoComposition - Wrapper for MainComposition
 */

// Basic composition component
import React, { useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Video, Sequence } from 'remotion';
import { CompositionData, CompositionElement, ElementRendererProps, LocalFile } from './types';
import { Layer } from './Layer';
import { FileResolver, createFileResolver } from './utils/fileResolver';
import { useAnimeTimeline } from './useAnimeTimeline';
import { createTimeline } from "animejs";

// Utility function to generate unique IDs
const generateUniqueId = (): string => {
  return `el-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Individual element renderer
const ElementRenderer: React.FC<ElementRendererProps & { fileResolver?: FileResolver; isPlayerContext?: boolean }> = ({ element, frame, fps, fileResolver, isPlayerContext = false }) => {
  // Ensure element has an ID
  const elementWithId = React.useMemo(() => {
    if (element.id) return element;
    return {
      ...element,
      id: generateUniqueId()
    };
  }, [element]);
  
  // Create ref for DOM element to use with anime.js
  const elementRef = useRef<HTMLDivElement>(null);
  
  const currentTimeInSeconds = frame / fps;
  
  // Check if element should be visible at current time
  const startTime = elementWithId.startTime || 0;
  const endTime = elementWithId.endTime || Infinity;
  const isVisible = currentTimeInSeconds >= startTime && currentTimeInSeconds <= endTime;
  
  // Handle animation execution - only in Player context
  const scopeRef = isPlayerContext ? useAnimeTimeline(() => {
    const tl = createTimeline({
      defaults: {
        loop: false,
      },
    });
    
    // Create animationConfig inside the factory to avoid stale closures
    const { animation } = elementWithId;
    if (animation && animation.props && Object.keys(animation.props).length > 0) {
      const animationConfig = {
        duration: animation.duration || 1000,
        ease: animation.ease || 'linear',
        delay: animation.delay || 0,
        alternate: animation.alternate || false,
        loop: animation.loop || false,
        autoplay: animation.autoplay !== false,
        // Add animation properties directly
        ...animation.props
      };
      
      // Check if DOM element exists before adding animation
      const domElement = document.getElementById(elementWithId.id);
      if (domElement) {
        tl.add(`#${elementWithId.id}`, animationConfig);
      } else {
        console.warn('DOM element not found for animation:', elementWithId.id);
      }
    }
    
    return tl;
  }, [elementWithId.id, JSON.stringify(elementWithId.animation)]) : elementWithId.id;
  
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
        <div ref={elementRef} style={style} id={scopeRef}>
          <Img
            id={elementWithId.id}
            src={resolvedSrc}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : null;

    case 'video':
      return resolvedSrc ? (
        <div ref={elementRef} style={style} id={scopeRef}>
          <Video
            id={elementWithId.id}
            src={resolvedSrc}
            style={{ width: '100%', height: '100%' }}
            startFrom={Math.floor((currentTimeInSeconds - startTime) * fps)}
          />
        </div>
      ) : null;

    case 'text':
      return (
        <div
          ref={elementRef}
          id={scopeRef}
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
          <div id={elementWithId.id}>
            {elementWithId.text || 'Sample Text'}
          </div>
        </div>
      );

    default:
      return null;
  }
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
  // Only use Remotion hooks when in Player context (no currentPageIndex)
  const isPlayerContext = currentPageIndex === undefined;
  const frame = isPlayerContext ? useCurrentFrame() : 0;
  const { fps } = isPlayerContext ? useVideoConfig() : { fps: data.fps };
  
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
              isPlayerContext={isPlayerContext}
            >
              <ElementRenderer
                element={element}
                frame={frame}
                fps={fps}
                fileResolver={fileResolver}
                isPlayerContext={isPlayerContext}
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
                  isPlayerContext={isPlayerContext}
                >
                  <ElementRenderer
                    element={element}
                    frame={frame - startFrame}
                    fps={fps}
                    fileResolver={fileResolver}
                    isPlayerContext={isPlayerContext}
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
