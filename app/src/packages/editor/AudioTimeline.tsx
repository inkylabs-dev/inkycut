import React, { useRef, useEffect } from 'react';
import { createDraggable } from 'animejs';
import { CompositionAudio } from './types';

interface AudioTimelineProps {
  /** Array of audio tracks to display */
  audios: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Callback to update audio delay when dragging */
  onAudioDelayUpdate?: (audioId: string, newDelay: number) => void;
}

interface AudioTimelineGroupProps {
  /** Array of audio tracks in this timeline group */
  timeline: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Index of this timeline group */
  timelineIndex: number;
  /** Callback to update audio delay when dragging */
  onAudioDelayUpdate?: (audioId: string, newDelay: number) => void;
}

/**
 * AudioTimelineGroup renders a single timeline lane with non-overlapping audio blocks
 */
const AudioTimelineGroup: React.FC<AudioTimelineGroupProps> = ({ 
  timeline, 
  timelineZoom, 
  timelineIndex,
  onAudioDelayUpdate 
}) => {
  const draggableRefs = useRef<Map<string, any>>(new Map());
  const draggingStates = useRef<Map<string, boolean>>(new Map());
  // Cleanup draggables on unmount and when timeline changes
  useEffect(() => {
    return () => {
      draggableRefs.current.forEach(draggable => {
        draggable.destroy?.();
      });
      draggableRefs.current.clear();
      draggingStates.current.clear();
    };
  }, [timeline, timelineZoom]);
  
  return (
    <div 
      key={`audio-timeline-${timelineIndex}`}
      className="audio-timeline relative bg-gray-300 dark:bg-gray-600 rounded mt-1" 
      style={{ height: '12px', width: '100%' }}
    >
      {timeline.map(audio => {
        const audioStart = audio.delay / 1000; // Convert to seconds
        const audioDuration = audio.duration / 1000; // Convert to seconds
        const leftPosition = audioStart * 100 * timelineZoom; // Position in pixels
        const blockWidth = Math.max(audioDuration * 100 * timelineZoom, 20); // Minimum 20px width
        const isCurrentlyDragging = draggingStates.current.get(audio.id) || false;
        
        const minHandleWidth = 20;
        const showHandle = blockWidth < 40; // Show handle for small blocks
        const handleWidth = Math.min(minHandleWidth, blockWidth * 0.3);
        
        return (
          <div
            key={`audio-block-${audio.id}`}
            ref={(el) => {
              if (el && onAudioDelayUpdate) {
                // Clean up existing draggable if it exists
                const existingDraggable = draggableRefs.current.get(audio.id);
                if (existingDraggable) {
                  existingDraggable.destroy?.();
                }
                
                // Store initial delay and position to calculate offset during drag
                let initialDelay = audio.delay;
                let isDragging = false;
                let dragStartX = 0;
                
                // Create new draggable
                const draggable = createDraggable(el, {
                  cursor: {
                    onHover: 'grab',
                    onGrab: 'grabbing'
                  },
                  // Configure for immediate response - no spring effects
                  y: false, // Disable vertical movement
                  onGrab: (draggableInstance: any) => {
                    initialDelay = audio.delay;
                    dragStartX = draggableInstance.x || 0;
                    isDragging = true;
                    draggingStates.current.set(audio.id, true);
                  },
                  onDrag: (draggableInstance: any) => {
                    // Don't update delay during drag to avoid compound movement
                    // The visual position is handled by the draggable itself
                  },
                  onRelease: (draggableInstance: any) => {
                    isDragging = false;
                    draggingStates.current.set(audio.id, false);
                    
                    // Calculate final delay based on total drag distance
                    if (onAudioDelayUpdate) {
                      const currentX = draggableInstance.x || 0;
                      const dragPixels = currentX - dragStartX;
                      const timeOffset = dragPixels / (100 * timelineZoom); // Convert px to seconds
                      const timeOffsetMs = timeOffset * 1000;
                      // Snap to 0.01s (10ms) increments
                      const snappedTimeOffsetMs = Math.round(timeOffsetMs / 10) * 10;
                      const newDelayMs = Math.max(0, initialDelay + snappedTimeOffsetMs);
                      
                      // Reset the draggable position immediately before state update
                      if (draggableInstance.setX) {
                        draggableInstance.setX(0);
                      } else if (draggable && draggable.setX) {
                        draggable.setX(0);
                      }
                      
                      onAudioDelayUpdate(audio.id, newDelayMs);
                    }
                  }
                });
                
                draggableRefs.current.set(audio.id, draggable);
              }
            }}
            className="absolute top-0 bottom-0 bg-blue-500 rounded hover:bg-blue-600 cursor-grab select-none"
            style={{
              left: isCurrentlyDragging ? undefined : `${leftPosition}px`,
              width: `${blockWidth}px`,
              transition: isCurrentlyDragging ? 'none' : 'left 0.1s ease-out',
            }}
            title={`Audio: ${audio.src.split('/').pop()} (${Math.round(audioDuration * 100) / 100}s) - Drag to adjust delay`}
          >
            {showHandle && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-blue-600 rounded-l opacity-80 hover:opacity-100"
                style={{ width: `${handleWidth}px` }}
                title="Drag handle for small audio blocks"
              />
            )}
          </div>
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
const AudioTimeline: React.FC<AudioTimelineProps> = ({ audios, timelineZoom, onAudioDelayUpdate }) => {
  // Don't render anything if there are no audio tracks
  if (!audios || audios.length === 0) {
    return null;
  }

  // Group audios into non-overlapping timelines
  const audioTimelines: CompositionAudio[][] = [];
  const sortedAudios = [...audios].sort((a, b) => a.delay - b.delay);
  
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
      {audioTimelines.map((timeline, timelineIndex) => (
        <AudioTimelineGroup
          key={`audio-timeline-group-${timelineIndex}`}
          timeline={timeline}
          timelineZoom={timelineZoom}
          timelineIndex={timelineIndex}
          onAudioDelayUpdate={onAudioDelayUpdate}
        />
      ))}
    </>
  );
};

export default AudioTimeline;