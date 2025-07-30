import React from 'react';
import { CompositionAudio } from './types';

interface AudioTimelineProps {
  /** Array of audio tracks to display */
  audios: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
}

interface AudioTimelineGroupProps {
  /** Array of audio tracks in this timeline group */
  timeline: CompositionAudio[];
  /** Timeline zoom level (pixels per second) */
  timelineZoom: number;
  /** Index of this timeline group */
  timelineIndex: number;
}

/**
 * AudioTimelineGroup renders a single timeline lane with non-overlapping audio blocks
 */
const AudioTimelineGroup: React.FC<AudioTimelineGroupProps> = ({ 
  timeline, 
  timelineZoom, 
  timelineIndex 
}) => {
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
        
        return (
          <div
            key={`audio-block-${audio.id}`}
            className="absolute top-0 bottom-0 bg-blue-500 rounded transition-all hover:bg-blue-600 cursor-pointer"
            style={{
              left: `${leftPosition}px`,
              width: `${blockWidth}px`,
            }}
            title={`Audio: ${audio.src.split('/').pop()} (${Math.round(audioDuration * 100) / 100}s)`}
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
const AudioTimeline: React.FC<AudioTimelineProps> = ({ audios, timelineZoom }) => {
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
        />
      ))}
    </>
  );
};

export default AudioTimeline;