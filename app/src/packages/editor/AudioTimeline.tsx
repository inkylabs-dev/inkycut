import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createDraggable } from 'animejs';
import { AudioVisualizer } from 'react-audio-visualize';
import { CompositionAudio, LocalFile } from './types';
import { createMediaResolver } from './utils/mediaResolver';

interface AudioTimelineProps {
  /** Array of audio tracks to display */
  audios: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Callback to update audio delay when dragged */
  onAudioDelayChange?: (audioId: string, newDelay: number) => void;
  /** Project files for media resolution */
  files?: LocalFile[];
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
  /** Project files for media resolution */
  files?: LocalFile[];
}

interface AudioBlockProps {
  audio: CompositionAudio;
  leftPosition: number;
  blockWidth: number;
  audioDuration: number;
  files?: LocalFile[];
}

/**
 * AudioBlock renders an individual audio block with waveform visualization
 */
const AudioBlock: React.FC<AudioBlockProps> = ({ audio, leftPosition, blockWidth, audioDuration, files }) => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create media resolver for audio source resolution
  const mediaResolver = useMemo(() => {
    return files ? createMediaResolver(files) : null;
  }, [files]);

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
      key={`audio-block-${audio.id}`}
      className="audio-block absolute top-0 bg-blue-500 rounded transition-colors hover:bg-blue-600 cursor-move overflow-hidden"
      style={{
        left: `${leftPosition}px`,
        width: `${blockWidth}px`,
        height: '13px',
      }}
      title={`Audio: ${audio.src.split('/').pop()} (${Math.round(audioDuration * 100) / 100}s)`}
    >
      {audioBlob && !isLoading ? (
        <div className="w-full h-full relative">
          <AudioVisualizer
            blob={audioBlob}
            width={blockWidth}
            height={13}
            barWidth={2}
            gap={1}
            barColor="#ffffff"
            backgroundColor="transparent"
            barPlayedColor="#ffffff"
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
  files
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timelineRef.current) return;

    let draggables: any[] = [];

    // Wait for DOM to be ready, then create draggable for audio blocks in this specific timeline
    const timeoutId = setTimeout(() => {
      if (timelineRef.current) {
        const audioBlocks = timelineRef.current.querySelectorAll('.audio-block');
        
        if (audioBlocks.length > 0) {
          // Create draggable for each audio block in this timeline group
          draggables = Array.from(audioBlocks).map((block, index) => {
            const audio = timeline[index];
            const originalLeftPosition = audio.delay / 1000 * 100 * timelineZoom; // Original position in pixels
            
            const draggable = createDraggable(block, {
              y: false, // Disable vertical movement
              onDrag: () => {
                // Dragging in progress
              },
              onGrab: () => {
                // Audio block grabbed
              },
              onRelease: (instance: any) => {
                if (onAudioDelayChange) {
                  // Calculate new delay based on original position plus drag delta
                  // instance.x is the drag offset/delta, not absolute position
                  const newPositionPixels = originalLeftPosition + instance.x;
                  const newPositionSeconds = newPositionPixels / (100 * timelineZoom);
                  const newDelayMs = Math.max(0, newPositionSeconds * 1000); // Ensure non-negative
                  
                  // Immediately update the element's CSS position to prevent visual jumping
                  const blockElement = block as HTMLElement;
                  const finalPositionPixels = Math.max(0, newPositionPixels); // Ensure non-negative
                  blockElement.style.left = `${finalPositionPixels}px`;
                  
                  // Reset any transforms that anime.js might have applied
                  blockElement.style.transform = 'none';
                  
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
      key={`audio-timeline-${timelineIndex}`}
      className="audio-timeline relative bg-gray-300 dark:bg-gray-600 rounded mt-1" 
      style={{ height: '13px', width: '100%' }}
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
const AudioTimeline: React.FC<AudioTimelineProps> = ({ audios, timelineZoom, onAudioDelayChange, files }) => {
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
          onAudioDelayChange={onAudioDelayChange}
          files={files}
        />
      ))}
    </>
  );
};

export default AudioTimeline;