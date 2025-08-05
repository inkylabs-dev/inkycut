import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createDraggable } from 'animejs';
import AudioVisualizer from './components/AudioVisualizer';
import { CompositionAudio, LocalFile } from '../composition/types';
import { createMediaResolver } from './utils/mediaResolver';

interface AudioTimelineProps {
  /** Array of audio tracks to display */
  audios: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Callback to update audio delay when dragged */
  onAudioDelayChange?: (audioId: string, newDelay: number) => void;
  /** Callback to update audio trimAfter when right edge is dragged */
  onAudioTrimAfterChange?: (audioId: string, newTrimAfter: number, newDuration: number) => void;
  /** Project files for media resolution */
  files?: LocalFile[];
  /** Total project duration in milliseconds for clamping */
  totalProjectDurationMs?: number;
}

interface AudioTimelineGroupProps {
  /** Array of audio tracks in this timeline group */
  timeline: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Index of this timeline group */
  timelineIndex: number;
  /** Callback to update audio delay when dragged */
  onAudioDelayChange?: (audioId: string, newDelay: number) => void;
  /** Callback to update audio trimAfter when right edge is dragged */
  onAudioTrimAfterChange?: (audioId: string, newTrimAfter: number, newDuration: number) => void;
  /** Project files for media resolution */
  files?: LocalFile[];
}

interface AudioBlockProps {
  audio: CompositionAudio;
  leftPosition: number;
  blockWidth: number;
  audioDuration: number;
  files?: LocalFile[];
  onTrimAfterChange?: (audioId: string, newTrimAfter: number, newDuration: number) => void;
  timelineZoom: number;
}

/**
 * AudioBlock renders an individual audio block with waveform visualization
 */
const AudioBlock: React.FC<AudioBlockProps> = ({ 
  audio, 
  leftPosition, 
  blockWidth, 
  audioDuration, 
  files, 
  onTrimAfterChange,
  timelineZoom
}) => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(blockWidth);
  const blockRef = useRef<HTMLDivElement>(null);

  // Create media resolver for audio source resolution
  const mediaResolver = useMemo(() => {
    return files ? createMediaResolver(files) : null;
  }, [files]);

  // Update currentWidth when blockWidth prop changes
  useEffect(() => {
    setCurrentWidth(blockWidth);
  }, [blockWidth]);

  useEffect(() => {
    // Load audio file for waveform visualization
    const loadAudioFile = async () => {
      if (!mediaResolver) {
        console.warn('No media resolver available for audio:', audio.src);
        return;
      }

      setIsLoading(true);
      try {
        const blob = await mediaResolver.getAudioBlob(audio.src);
        setAudioBlob(blob);
      } catch (error) {
        console.warn('Failed to load audio for waveform:', error);
        setAudioBlob(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioFile();
  }, [audio.src, mediaResolver]);


  return (
    <div
      ref={blockRef}
      className="audio-block absolute top-0 bg-blue-500 rounded transition-colors overflow-hidden"
      style={{
        left: `${leftPosition}px`,
        width: `${currentWidth}px`,
        height: '26px',
      }}
      title={`Audio: ${audio.src.split('/').pop()} (${Math.round(audioDuration * 100) / 100}s / ${Math.round((audio.duration + audio.trimBefore + audio.trimAfter) / 100) / 10}s max) - Drag right edge to trim`}
    >
      {/* Draggable content area - excludes the resize handle */}
      <div 
        className="audio-draggable-area absolute top-0 left-0 bottom-0 cursor-move hover:bg-blue-600 transition-colors"
        style={{ 
          right: '8px' // Leave space for 2px resize handle + some padding
        }}
      >
        {audioBlob && !isLoading ? (
          <div className="w-full h-full relative">
            <AudioVisualizer
              blob={audioBlob}
              width={currentWidth - 8} // Adjust width to account for resize handle
              height={26}
              barWidth={2}
              gap={1}
              barColor="#ffffff"
              backgroundColor="transparent"
              trimBefore={audio.trimBefore}
              trimAfter={audio.trimAfter}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-white text-xs">Loading...</div>
            ) : (
              <div className="text-white text-xs">Audio</div>
            )}
          </div>
        )}
      </div>
      
      {/* Resize handle */}
      <div 
        className={`audio-resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-30 transition-colors z-10 ${
          isResizing ? 'bg-black bg-opacity-40' : ''
        }`}
        onMouseDown={(event) => {
          console.log('Resize handle mousedown triggered');
          event.stopPropagation();
          event.preventDefault();
          setIsResizing(true);
          
          const startMouseX = event.clientX;
          const startWidth = blockWidth;

          const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startMouseX;
            
            // Calculate maximum width based on total audio duration
            // Total duration = current effective duration + trimBefore + trimAfter
            const totalAudioDurationMs = audio.duration + audio.trimBefore + audio.trimAfter;
            const totalAudioDurationSeconds = totalAudioDurationMs / 1000;
            const maxWidth = totalAudioDurationSeconds * 100 * timelineZoom;
            
            // Constrain width between minimum (20px) and maximum (total duration)
            const newWidth = Math.max(20, Math.min(maxWidth, startWidth + deltaX));
            
            // Update both DOM and React state for immediate feedback and waveform update
            setCurrentWidth(newWidth);
          };

          const handleMouseUp = (e: MouseEvent) => {
            console.log('Resizing ended');
            if (onTrimAfterChange) {
              const deltaX = e.clientX - startMouseX;
              
              // Calculate maximum width based on total audio duration (same as in handleMouseMove)
              const totalAudioDurationMs = audio.duration + audio.trimBefore + audio.trimAfter;
              const totalAudioDurationSeconds = totalAudioDurationMs / 1000;
              const maxWidth = totalAudioDurationSeconds * 100 * timelineZoom;
              
              // Constrain width between minimum (20px) and maximum (total duration)
              const newWidth = Math.max(20, Math.min(maxWidth, startWidth + deltaX));
              const newDurationSeconds = newWidth / (100 * timelineZoom);
              const newDurationMs = newDurationSeconds * 1000;
              
              // When dragging right edge, duration and trimAfter should be the same value
              // This means we're setting the visible duration, and trimAfter trims everything after that point
              const newTrimAfter = newDurationMs;
              
              console.log(`Audio ${audio.id}: totalDuration=${totalAudioDurationMs}ms, newDuration=${newDurationMs}ms, newTrimAfter=${newTrimAfter}ms`);
              
              // Final state update - this will trigger a re-render with the final width
              setCurrentWidth(newWidth);
              onTrimAfterChange(audio.id, newTrimAfter, newDurationMs);
            }
            
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
        title={`Drag to trim audio end (max: ${Math.round((audio.duration + audio.trimBefore + audio.trimAfter) / 100) / 10}s total duration)`}
      />
    </div>
  );
};

/**
 * AudioTimelineGroup renders a single timeline lane with non-overlapping audio blocks
 */
const AudioTimelineGroup: React.FC<AudioTimelineGroupProps> = ({ 
  timeline, 
  timelineZoom, 
  timelineIndex,
  onAudioDelayChange,
  onAudioTrimAfterChange,
  files
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timelineRef.current) return;

    let draggables: any[] = [];

    // Wait for DOM to be ready, then create draggable for audio blocks in this specific timeline
    const timeoutId = setTimeout(() => {
      if (timelineRef.current) {
        const audioBlocks = timelineRef.current.querySelectorAll('.audio-draggable-area');
        
        if (audioBlocks.length > 0) {
          // Create draggable for each audio block in this timeline group
          draggables = Array.from(audioBlocks).map((block, index) => {
            const audio = timeline[index];
            const originalLeftPosition = audio.delay / 1000 * 100 * timelineZoom; // Original position in pixels
            
            const draggable = createDraggable(block, {
              y: false, // Disable vertical movement
              onDrag: (instance: any) => {
                // During drag, also apply the same transform to the parent audio-block
                // so the entire blue block moves with the content
                const draggableElement = block as HTMLElement;
                const audioBlockElement = draggableElement.closest('.audio-block') as HTMLElement;
                if (audioBlockElement) {
                  audioBlockElement.style.transform = `translateX(${instance.x}px)`;
                }
              },
              onGrab: (event: any) => {
                // Check if the grab originated from a resize handle
                const target = event?.target || event?.srcElement;
                if (target && target.closest('.audio-resize-handle')) {
                  console.log('Drag blocked - resize handle clicked');
                  return false; // Prevent dragging
                }
                console.log('Audio block grab started');
              },
              onRelease: (instance: any) => {
                if (onAudioDelayChange) {
                  // Calculate new delay based on original position plus drag delta
                  // instance.x is the drag offset/delta, not absolute position
                  const newPositionPixels = originalLeftPosition + instance.x;
                  const newPositionSeconds = newPositionPixels / (100 * timelineZoom);
                  const newDelayMs = Math.max(0, newPositionSeconds * 1000); // Ensure non-negative
                  
                  // Update the audio-block element's CSS position to prevent visual jumping
                  const draggableElement = block as HTMLElement;
                  const audioBlockElement = draggableElement.closest('.audio-block') as HTMLElement;
                  if (audioBlockElement) {
                    const finalPositionPixels = Math.max(0, newPositionPixels); // Ensure non-negative
                    audioBlockElement.style.left = `${finalPositionPixels}px`;
                    // Reset transforms on both elements
                    audioBlockElement.style.transform = 'none';
                  }
                  
                  // Reset any transforms that anime.js might have applied to the draggable area
                  draggableElement.style.transform = 'none';
                  
                  // Update the state
                  onAudioDelayChange(audio.id, newDelayMs);
                }
              }
            });
            return draggable;
          });
        }
      }
    }, 0);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      
      // Disable all draggables
      draggables.forEach(draggable => {
        if (draggable && typeof draggable.disable === 'function') {
          draggable.disable();
        }
      });
    };
  }, [timeline, timelineZoom, timelineIndex]);

  return (
    <div 
      ref={timelineRef}
      data-testid="audio-timeline"
      className="audio-timeline relative bg-gray-300 dark:bg-gray-600 rounded mt-1" 
      style={{ height: '26px', width: '100%' }}
    >
      {timeline.map(audio => {
        const audioStart = audio.delay / 1000; // Convert to seconds
        const audioDuration = audio.duration / 1000; // Convert to seconds
        const leftPosition = audioStart * 100 * timelineZoom; // Position in pixels
        const blockWidth = Math.max(audioDuration * 100 * timelineZoom, 20); // Minimum 20px width
        
        return (
          <AudioBlock
            key={`audio-block-${audio.id}`}
            audio={audio}
            leftPosition={leftPosition}
            blockWidth={blockWidth}
            audioDuration={audioDuration}
            files={files}
            onTrimAfterChange={onAudioTrimAfterChange}
            timelineZoom={timelineZoom}
          />
        );
      })}
    </div>
  );
};

/**
 * AudioTimeline component displays audio tracks in grouped timelines under the page blocks.
 * Audio tracks are automatically grouped into separate timeline lanes when they overlap,
 * ensuring all audio is visible without visual conflicts.
 */
const AudioTimeline: React.FC<AudioTimelineProps> = ({ 
  audios, 
  timelineZoom, 
  onAudioDelayChange, 
  onAudioTrimAfterChange, 
  files, 
  totalProjectDurationMs 
}) => {
  // Don't render anything if there are no audio tracks
  if (!audios || audios.length === 0) {
    return null;
  }

  // Clamp audio durations to project duration if specified
  const clampedAudios = useMemo(() => {
    if (!totalProjectDurationMs) return audios;
    
    return audios.map(audio => {
      const audioEnd = audio.delay + audio.duration;
      if (audioEnd > totalProjectDurationMs) {
        const clampedDuration = Math.max(0, totalProjectDurationMs - audio.delay);
        return {
          ...audio,
          duration: clampedDuration
        };
      }
      return audio;
    });
  }, [audios, totalProjectDurationMs]);

  // Group audios into non-overlapping timelines
  const audioTimelines: CompositionAudio[][] = [];
  const sortedAudios = [...clampedAudios].sort((a, b) => a.delay - b.delay);
  
  for (const audio of sortedAudios) {
    const audioStart = audio.delay;
    const audioEnd = audio.delay + audio.duration;
    
    // Find a timeline where this audio doesn't overlap
    let placedInTimeline = false;
    for (const timeline of audioTimelines) {
      const canFitInTimeline = timeline.every(existingAudio => {
        const existingStart = existingAudio.delay;
        const existingEnd = existingAudio.delay + existingAudio.duration;
        return audioEnd <= existingStart || audioStart >= existingEnd;
      });
      
      if (canFitInTimeline) {
        timeline.push(audio);
        placedInTimeline = true;
        break;
      }
    }
    
    // If couldn't fit in any existing timeline, create a new one
    if (!placedInTimeline) {
      audioTimelines.push([audio]);
    }
  }
  
  return (
    <>
      {audioTimelines.map((timeline, timelineIndex) => {
        // Create a stable key based on the audio IDs in this timeline
        const timelineKey = timeline.map(audio => audio.id).sort().join('-');
        return (
          <AudioTimelineGroup
            key={`timeline-${timelineKey}`}
            timeline={timeline}
            timelineZoom={timelineZoom}
            timelineIndex={timelineIndex}
            onAudioDelayChange={onAudioDelayChange}
            onAudioTrimAfterChange={onAudioTrimAfterChange}
            files={files}
          />
        );
      })}
    </>
  );
};

export default AudioTimeline;