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
import { AbsoluteFill, useCurrentFrame, Img, OffthreadVideo, Sequence, Audio } from 'remotion';
import { Gif } from '@remotion/gif';
import { CompositionData, CompositionElement, ElementRendererProps, LocalFile } from './types';
import { Layer } from './Layer';
import { FileResolver, createFileResolver } from './utils/fileResolver';
import { useAnimeTimeline } from './useAnimeTimeline';
import { createTimeline } from "animejs";

// Utility function to generate unique IDs
const generateUniqueId = (): string => {
  return `el-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
};

// Utility function to resolve audio source with data URL conversion
const resolveAudioSource = async (src: string, files?: LocalFile[]): Promise<string> => {
  if (!files || !src.startsWith('LocalFile:')) {
    return src; // Return as-is if not a LocalFile reference
  }
  
  // Find the corresponding local file
  const fileName = src.replace('LocalFile:', '');
  const localFile = files.find(file => file.name === fileName);
  
  if (!localFile || !localFile.blob) {
    console.warn(`Local audio file not found or no blob available: ${fileName}`);
    return localFile?.dataUrl || src;
  }
  
  try {
    // For audio files, just return the data URL directly
    // The audioBufferToDataUrl function is meant for Web Audio API AudioBuffer objects
    return localFile.dataUrl;
  } catch (error) {
    console.warn(`Failed to convert audio to data URL: ${error}`);
    return localFile.dataUrl || src;
  }
};

// Helper functions to get element dimensions
const getElementWidth = (element: CompositionElement): number => {
  if (element.getWidth) {
    return element.getWidth();
  }
  return element.width || 0;
};

const getElementHeight = (element: CompositionElement): number => {
  if (element.getHeight) {
    return element.getHeight();
  }
  return element.height || 0;
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
  const delayMs = elementWithId.delay || 0;
  const delayInSeconds = delayMs / 1000;
  const isVisible = currentTimeInSeconds >= delayInSeconds;
  
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
    width: getElementWidth(elementWithId),
    height: elementWithId.type === 'text' ? 'auto' : getElementHeight(elementWithId),
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
          {resolvedSrc.toLowerCase().endsWith('.gif') ? (
            <Gif
              id={elementWithId.id}
              src={resolvedSrc}
              playbackRate={1}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Img
              id={elementWithId.id}
              src={resolvedSrc}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      ) : null;

    case 'video':
      return resolvedSrc ? (
        <div ref={elementRef} style={style} id={scopeRef}>
          <OffthreadVideo
            id={elementWithId.id}
            src={resolvedSrc}
            style={{ width: '100%', height: '100%' }}
            startFrom={Math.floor((currentTimeInSeconds - delayInSeconds) * fps)}
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
            display: 'block',
            padding: '8px',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            boxSizing: 'border-box',
          }}
        >
          <div id={elementWithId.id}>
            {elementWithId.text || 'Sample Text'}
          </div>
        </div>
      );

    case 'group':
      // Calculate the natural bounds of all child elements
      const childElements = elementWithId.elements || [];
      let maxWidth = 0;
      let maxHeight = 0;
      
      childElements.forEach(child => {
        const childLeft = child.left || 0;
        const childTop = child.top || 0;
        const childWidth = getElementWidth(child);
        // For text elements, estimate height based on fontSize since actual height is auto
        const childHeight = child.type === 'text' 
          ? (child.fontSize || 24) * 1.5 // Rough estimate: fontSize * line height
          : getElementHeight(child);
        const childRight = childLeft + childWidth;
        const childBottom = childTop + childHeight;
        maxWidth = Math.max(maxWidth, childRight);
        maxHeight = Math.max(maxHeight, childBottom);
      });

      // Create group element with dynamic getWidth/getHeight methods
      const groupElementWithMethods = {
        ...elementWithId,
        getWidth: () => elementWithId.width || maxWidth,
        getHeight: () => elementWithId.height || maxHeight,
      };

      // Use the dynamic methods to get group dimensions
      const groupWidth = getElementWidth(groupElementWithMethods);
      const groupHeight = getElementHeight(groupElementWithMethods);
      
      // Calculate scale based on group dimensions vs content bounds
      const scaleX = maxWidth > 0 ? groupWidth / maxWidth : 1;
      const scaleY = maxHeight > 0 ? groupHeight / maxHeight : 1;
      const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit within bounds
      
      return (
        <div
          ref={elementRef}
          id={scopeRef}
          style={{
            ...style,
            width: groupWidth,
            height: groupHeight,
            overflow: 'hidden',
          }}
        >
          {childElements.map((childElement) => {
            // Scale child element dimensions and position
            const scaledChild = {
              ...childElement,
              left: (childElement.left || 0) * scale,
              top: (childElement.top || 0) * scale,
              width: getElementWidth(childElement) * scale,
              // For text elements, scale fontSize instead of height (height is auto)
              ...(childElement.type === 'text' 
                ? { fontSize: (childElement.fontSize || 24) * scale }
                : { height: getElementHeight(childElement) * scale }
              ),
              // Ensure child has unique ID
              id: childElement.id || generateUniqueId(),
            };

            return (
              <ElementRenderer
                key={`group-child-${scaledChild.id}`}
                element={scaledChild}
                frame={frame}
                fps={fps}
                fileResolver={fileResolver}
                isPlayerContext={isPlayerContext}
              />
            );
          })}
        </div>
      );

    default:
      return null;
  }
};

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
  let frame = 0;
  let isPlayerContext = false;

  try {
    frame = useCurrentFrame();
    isPlayerContext = true; // If useCurrentFrame works, we are in Player context
  } catch (error) {
    console.warn('useCurrentFrame is only available in Player context');
  }
  
  const { fps } = data;
  
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
        {/* Audio tracks - render at root level */}
        {data.audios && data.audios.map((audio, index) => {
          const resolvedAudioSrc = audio.src && fileResolver ? fileResolver.resolve(audio.src) : audio.src;
          
          // Convert delay and duration from milliseconds to frames
          const delayInFrames = audio.delay ? Math.floor((audio.delay / 1000) * fps) : 0;
          const durationInFrames = audio.duration ? Math.floor((audio.duration / 1000) * fps) : undefined;
          
          return resolvedAudioSrc ? (
            <Sequence
              key={`audio-sequence-${index}`}
              from={delayInFrames}
              durationInFrames={durationInFrames}
            >
              <Audio
                key={`audio-${index}`}
                src={resolvedAudioSrc}
                volume={audio.muted ? 0 : audio.volume}
                loop={audio.loop}
                muted={audio.muted}
                trimBefore={audio.trimBefore ? Math.floor((audio.trimBefore / 1000) * fps) : 0}
                trimAfter={audio.trimAfter ? Math.floor((audio.trimAfter / 1000) * fps) : undefined}
                playbackRate={audio.playbackRate || 1}
                toneFrequency={audio.toneFrequency || 1}
              />
            </Sequence>
          ) : null;
        })}
        
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

  // Convert page durations from milliseconds to frames
  const pageDurations = data.pages.map(page => Math.round(((page.duration || 0) / 1000) * fps));
  let cumulativeFrames = 0;
  
  
  return (
    <AbsoluteFill style={outer}>
      {/* Audio tracks - render at root level for full video */}
      {data.audios && data.audios.map((audio, index) => {
        const resolvedAudioSrc = audio.src && fileResolver ? fileResolver.resolve(audio.src) : audio.src;
        
        // Convert delay and duration from milliseconds to frames
        const delayInFrames = audio.delay ? Math.floor((audio.delay / 1000) * fps) : 0;
        const durationInFrames = audio.duration ? Math.floor((audio.duration / 1000) * fps) : undefined;
        
        return resolvedAudioSrc ? (
          <Sequence
            key={`audio-sequence-${index}`}
            from={delayInFrames}
            durationInFrames={durationInFrames}
          >
            <Audio
              key={`audio-${index}`}
              src={resolvedAudioSrc}
              volume={audio.muted ? 0 : audio.volume}
              loop={audio.loop}
              muted={audio.muted}
              startFrom={audio.trimBefore ? Math.floor((audio.trimBefore / 1000) * fps) : 0}
              endAt={audio.trimAfter ? Math.floor((audio.trimAfter / 1000) * fps) : undefined}
              playbackRate={audio.playbackRate}
              toneFrequency={audio.toneFrequency}
            />
          </Sequence>
        ) : null;
      })}
      
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
