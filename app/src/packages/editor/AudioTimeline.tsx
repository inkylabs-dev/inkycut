import React, { useEffect, useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import AudioVisualizer from './components/AudioVisualizer';
import { CompositionAudio } from '../composition/types';
import { createMediaResolver } from './utils/mediaResolver';
import { projectAtom, filesAtom, appStateAtom } from './atoms';
import { AudioTimelineProps, AudioTimelineGroupProps, AudioBlockProps } from './types';

/**
 * AudioBlock renders an individual audio block with waveform visualization
 */
const AudioBlock: React.FC<AudioBlockProps> = ({ 
  audio, 
  leftPosition, 
  blockWidth, 
  audioDuration, 
  onAudioClick
}) => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Read values from atoms instead of props
  const [files] = useAtom(filesAtom);
  const [project] = useAtom(projectAtom);
  
  const fps = project?.composition?.fps || 30;

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

  const handleAudioClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onAudioClick) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate the clicked position within the audio block
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const relativePosition = clickX / blockWidth; // Position within the audio block (0-1)
    
    // Calculate the target frame based on audio delay and relative position
    const audioDelayFrames = audio.delay; // audio.delay is already in frames
    const audioDurationFrames = audio.duration; // audio.duration is already in frames
    const clickOffsetFrames = relativePosition * audioDurationFrames;
    const targetFrame = Math.floor(audioDelayFrames + clickOffsetFrames);
    
    onAudioClick(targetFrame);
  };

  return (
    <div
      className="audio-block absolute top-0 bg-blue-500 rounded overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors"
      style={{
        left: `${leftPosition}px`,
        width: `${blockWidth}px`,
        height: '26px',
      }}
      onClick={handleAudioClick}
      title={`Audio: ${audio.src.split('/').pop()} (${Math.round(audioDuration * 100) / 100}s) - Click to seek`}
    >
      {audioBlob && !isLoading ? (
        <div className="w-full h-full relative">
          <AudioVisualizer
            blob={audioBlob}
            width={blockWidth}
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
  );
};

/**
 * AudioTimelineGroup renders a single timeline lane with non-overlapping audio blocks
 */
const AudioTimelineGroup: React.FC<AudioTimelineGroupProps> = ({ 
  timeline, 
  timelineIndex,
  onAudioClick
}) => {
  // Read values from atoms instead of props
  const [files] = useAtom(filesAtom);
  const [project] = useAtom(projectAtom);
  const [appState] = useAtom(appStateAtom);
  
  const fps = project?.composition?.fps || 30;
  const timelineZoom = appState.zoomLevel || 1;

  return (
    <div 
      data-testid="audio-timeline"
      className="audio-timeline relative bg-gray-300 dark:bg-gray-600 rounded mt-1" 
      style={{ height: '26px', width: '100%' }}
    >
      {timeline.map(audio => {
        const audioStart = audio.delay / fps; // Convert frames to seconds
        const audioDuration = audio.duration / fps; // Convert frames to seconds
        const leftPosition = audioStart * 100 * timelineZoom; // Position in pixels
        const blockWidth = Math.max(audioDuration * 100 * timelineZoom, 20); // Minimum 20px width
        
        return (
          <AudioBlock
            key={`audio-block-${audio.id}`}
            audio={audio}
            leftPosition={leftPosition}
            blockWidth={blockWidth}
            audioDuration={audioDuration}
            onAudioClick={onAudioClick}
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
  totalProjectDurationFrames,
  onAudioClick
}) => {
  // Read values from atoms instead of props
  const [project] = useAtom(projectAtom);
  const [files] = useAtom(filesAtom);
  const [appState] = useAtom(appStateAtom);
  
  const audios = project?.composition?.audios || [];
  const fps = project?.composition?.fps || 30;
  const timelineZoom = appState.zoomLevel || 1;
  // Don't render anything if there are no audio tracks
  if (!audios || audios.length === 0) {
    return null;
  }

  // Clamp audio durations to project duration if specified
  const clampedAudios = useMemo(() => {
    if (!totalProjectDurationFrames) return audios;
    
    return audios.map(audio => {
      const audioEnd = audio.delay + audio.duration;
      if (audioEnd > totalProjectDurationFrames) {
        const clampedDuration = Math.max(0, totalProjectDurationFrames - audio.delay);
        return {
          ...audio,
          duration: clampedDuration
        };
      }
      return audio;
    });
  }, [audios, totalProjectDurationFrames]);

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
            timelineIndex={timelineIndex}
            onAudioClick={onAudioClick}
          />
        );
      })}
    </>
  );
};

export default AudioTimeline;