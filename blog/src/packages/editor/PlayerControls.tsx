import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Player } from '@remotion/player';
import { 
  PlayIcon, 
  PauseIcon
} from '@heroicons/react/24/outline';
import type { CompositionData, LocalFile } from '../composition/types';
import { defaultCompositionData } from '../composition/types';
import AudioTimeline from './AudioTimeline';
import { Playhead } from './components/Playhead';
import PageTrack from './components/PageTrack';
import TimeRuler from './components/TimeRuler';
import { projectAtom, filesAtom, appStateAtom, updateProjectAtom, addUserMessageToQueueAtom, updateAppStateAtom, setSelectedPageAtom } from './atoms';

interface PlayerControlsProps {
  playerRef: React.RefObject<React.ComponentRef<typeof Player>>;
  onTimelineUpdate: (timeline: any[]) => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
  onPageSelect?: (page: any) => void;
  isReadOnly?: boolean;
}

export default function PlayerControls({ 
  playerRef, 
  onCompositionUpdate, 
  onPageSelect, 
  isReadOnly = false 
}: PlayerControlsProps) {
  // Use Jotai atoms instead of props
  const [project] = useAtom(projectAtom);
  const [files] = useAtom(filesAtom);
  const [appState] = useAtom(appStateAtom);
  const [, updateProject] = useAtom(updateProjectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  const updateAppState = useSetAtom(updateAppStateAtom);
  const setSelectedPage = useSetAtom(setSelectedPageAtom);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTimeline, ] = useState(true);
  const [compositionData, setCompositionData] = useState<CompositionData>(defaultCompositionData);
  const [playerReady, setPlayerReady] = useState(false);
  
  const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track previous project state for comparison
  const prevProjectIdRef = useRef<string>('');
  const prevCompositionRef = useRef<string>('');
  
  // Update composition data when project changes
  useEffect(() => {
    // Extract current project identifiers for comparison
    const currentProjectId = project?.id || '';
    const currentCompositionId = project?.composition ? JSON.stringify(project.composition) : '';
    
    // Check if the project has been completely reset or changed
    const isNewProject = currentProjectId !== prevProjectIdRef.current;
    const isCompositionReset = currentCompositionId !== prevCompositionRef.current && currentCompositionId !== '';
    
    if (project?.composition) {
      // Always update if this is a new project or the composition was reset
      if (isNewProject || isCompositionReset) {
        console.log('Project reset or changed completely - updating editor');
        setCompositionData(project.composition);
      } else {
        setCompositionData(project.composition);
      }
    }
    
    // Update refs for next comparison
    prevProjectIdRef.current = currentProjectId;
    prevCompositionRef.current = currentCompositionId;
  }, [project]);
  
  // Calculate total duration and current time
  const totalFrames = compositionData.pages.reduce((sum, page) => sum + page.duration, 0);
  const totalDuration = totalFrames / compositionData.fps;
  const currentTime = currentFrame / compositionData.fps;

  // Update selected page based on current frame
  const updateSelectedPageFromFrame = useCallback((frame: number) => {
    let cumulativeFrames = 0;
    for (let i = 0; i < compositionData.pages.length; i++) {
      const pageDurationInFrames = compositionData.pages[i].duration;
      if (frame < cumulativeFrames + pageDurationInFrames) {
        const currentPage = compositionData.pages[i];
        if (currentPage && project?.appState?.selectedPageId !== currentPage.id) {
          setSelectedPage(currentPage);
        }
        return;
      }
      cumulativeFrames += pageDurationInFrames;
    }
    // If we're at the end, select the last page
    if (compositionData.pages.length > 0) {
      const lastPage = compositionData.pages[compositionData.pages.length - 1];
      if (lastPage && project?.appState?.selectedPageId !== lastPage.id) {
        setSelectedPage(lastPage);
      }
    }
  }, [compositionData.pages, project?.appState?.selectedPageId, setSelectedPage]);

  // Frame tracking functions
  const startFrameTracking = useCallback(() => {
    console.log('Starting frame tracking');
    if (frameUpdateIntervalRef.current) {
      clearInterval(frameUpdateIntervalRef.current);
    }
    
    frameUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerReady) {
        try {
          const frame = playerRef.current.getCurrentFrame();
          setCurrentFrame(frame);
          
          // Update selected page during playback
          updateSelectedPageFromFrame(frame);
          
          // Auto-pause at end
          if (frame >= totalFrames - 1) {
            console.log('Reached end, auto-pausing');
            setIsPlaying(false);
            stopFrameTracking();
          }
        } catch (error) {
          console.error('Error getting current frame:', error);
        }
      }
    }, 50);
  }, [totalFrames, playerReady, updateSelectedPageFromFrame]);

  const stopFrameTracking = useCallback(() => {
    if (frameUpdateIntervalRef.current) {
      clearInterval(frameUpdateIntervalRef.current);
      frameUpdateIntervalRef.current = null;
    }
  }, []);

  // Start tracking when player is ready
  useEffect(() => {
    return () => {
      stopFrameTracking();
    };
  }, [stopFrameTracking]);

  // Initialize player when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerRef.current && !playerReady) {
        setPlayerReady(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [playerReady]);

  // Calculate current page based on frame
  const getCurrentPage = () => {
    let cumulativeFrames = 0;
    for (let i = 0; i < compositionData.pages.length; i++) {
      const pageDurationInFrames = compositionData.pages[i].duration;
      if (currentFrame < cumulativeFrames + pageDurationInFrames) {
        return { pageIndex: i, frameOffset: currentFrame - cumulativeFrames };
      }
      cumulativeFrames += pageDurationInFrames;
    }
    return { pageIndex: compositionData.pages.length - 1, frameOffset: 0 };
  };

  const handlePlay = useCallback(() => {
    console.log('handlePlay called', { playerReady, isPlaying, currentFrame, totalFrames });
    
    if (!playerRef.current || !playerReady) {
      console.warn('Player not ready');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing player');
        playerRef.current.pause();
        setIsPlaying(false);
        stopFrameTracking();
      } else {
        // If at the end, restart from beginning
        if (currentFrame >= totalFrames - 1) {
          console.log('Restarting from beginning');
          playerRef.current.seekTo(0);
          setCurrentFrame(0);
        }
        console.log('Playing player');
        playerRef.current.play();
        setIsPlaying(true);
        startFrameTracking();
      }
    } catch (error) {
      console.error('Error playing/pausing:', error);
    }
  }, [isPlaying, currentFrame, totalFrames, playerReady, startFrameTracking, stopFrameTracking]);

  // Add spacebar event listener for play/pause
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && 
          !(event.target instanceof HTMLInputElement) && 
          !(event.target instanceof HTMLTextAreaElement) &&
          !(event.target as Element)?.closest?.('[contenteditable="true"]')) {
        event.preventDefault();
        handlePlay();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlay]);

  const handleSeek = useCallback((frame: number) => {
    if (!playerRef.current || !playerReady) {
      console.warn('Player not ready');
      return;
    }

    try {
      // If player is currently playing, pause it when seeking
      if (isPlaying) {
        console.log('Pausing player due to seek operation');
        playerRef.current.pause();
        setIsPlaying(false);
        stopFrameTracking();
      }

      const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));
      playerRef.current.seekTo(clampedFrame);
      setCurrentFrame(clampedFrame);
      
      // Update selected page based on the new frame position
      updateSelectedPageFromFrame(clampedFrame);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [totalFrames, playerReady, isPlaying, stopFrameTracking, updateSelectedPageFromFrame]);

  const handlePageClick = (pageIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    // Calculate the start frame of the clicked page
    let cumulativeFrames = 0;
    for (let i = 0; i < pageIndex; i++) {
      const pageDurationFrames = compositionData.pages[i].duration; // duration is already in frames
      cumulativeFrames += pageDurationFrames;
    }
    
    // Calculate the relative position within the clicked block
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const blockWidth = rect.width;
    const relativePosition = clickX / blockWidth;
    
    // Calculate the frame position within the page
    const pageDurationFrames = compositionData.pages[pageIndex].duration; // duration is already in frames
    const relativeFrames = Math.floor(relativePosition * pageDurationFrames);
    const targetFrame = cumulativeFrames + relativeFrames;
    
    handleSeek(targetFrame);
    
    // Call onPageSelect with the selected page
    if (onPageSelect && compositionData.pages[pageIndex]) {
      onPageSelect(compositionData.pages[pageIndex]);
    }
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    
    // Calculate position relative to project duration, not full timeline width
    const projectDurationWidth = totalDuration * 100 * timelineZoom;
    const relativePosition = Math.max(0, Math.min(1, clickX / projectDurationWidth));
    
    const targetFrame = Math.floor(relativePosition * totalFrames);
    handleSeek(targetFrame);
    
    // Update selected page when clicking on timeline
    updateSelectedPageFromFrame(targetFrame);
  };

  const [isDragging, setIsDragging] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(appState.zoomLevel || 1);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to calculate the actual timeline width
  const getActualTimelineWidth = useCallback(() => {
    return Math.max(
      compositionData.pages.reduce((sum, p) => sum + Math.max((p.duration / compositionData.fps) * 100 * timelineZoom, 80), 0), 
      800
    );
  }, [compositionData.pages, timelineZoom]);


  const handlePlayheadMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };



  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        const timelineContainer = timelineContainerRef.current;
        if (!timelineContainer) return;
        
        const containerRect = timelineContainer.getBoundingClientRect();
        const mouseX = event.clientX - containerRect.left;
        const scrollLeft = timelineContainer.scrollLeft;
        const adjustedMouseX = mouseX + scrollLeft;
        const projectDurationWidth = totalDuration * 100 * timelineZoom;
        const relativePosition = Math.max(0, Math.min(1, adjustedMouseX / projectDurationWidth));
        const targetFrame = Math.floor(relativePosition * totalFrames);
        handleSeek(targetFrame);
        
        // Update selected page during drag
        updateSelectedPageFromFrame(targetFrame);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, totalFrames, handleSeek, timelineZoom, totalDuration, updateSelectedPageFromFrame]);


  const updateZoomInAppState = (newZoom: number) => {
    if (project) {
      const updatedProject = {
        ...project,
        appState: {
          ...project.appState,
          zoomLevel: newZoom
        }
      };
      updateProject(updatedProject);
    }
  };

  // Initialize timeline zoom from app state
  useEffect(() => {
    if (appState.zoomLevel && appState.zoomLevel !== timelineZoom) {
      setTimelineZoom(appState.zoomLevel);
    }
  }, [appState.zoomLevel]);

  // Handle mouse wheel zoom in timeline area
  useEffect(() => {
    const handleWheelZoom = (event: WheelEvent) => {
      const timelineContainer = timelineContainerRef.current;
      if (!timelineContainer) return;

      const target = event.target as Element;
      if (!timelineContainer.contains(target)) return;

      const isZoomGesture = event.ctrlKey || event.metaKey;
      if (!isZoomGesture) return;

      event.preventDefault();
      event.stopPropagation();

      const zoomDelta = event.deltaY > 0 ? 0.98 : 1.02;
      const newZoom = Math.max(0.1, Math.min(10, timelineZoom * zoomDelta));
      
      setTimelineZoom(newZoom);
      updateZoomInAppState(newZoom);
    };

    const timelineContainer = timelineContainerRef.current;
    if (timelineContainer) {
      timelineContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
    }

    return () => {
      if (timelineContainer) {
        timelineContainer.removeEventListener('wheel', handleWheelZoom);
      }
    };
  }, [timelineZoom, updateZoomInAppState]);

  const formatTime = (seconds: number) => {
    const totalTenths = Math.ceil(seconds * 10);
    const mins = Math.floor(totalTenths / 600);
    const remainingTenths = totalTenths % 600;
    const secs = Math.floor(remainingTenths / 10);
    const tenths = remainingTenths % 10;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const handleFileDropped = (file: LocalFile, pageIndex: number) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) return;
    
    const targetPage = compositionData.pages[pageIndex];
    if (!targetPage) return;
    
    updateAppState({ selectedPageId: targetPage.id });
    
    const canvasWidth = compositionData.width || 1920;
    const canvasHeight = compositionData.height || 1080;
    
    let elementWidth = file.width || (isVideo ? 320 : 200);
    let elementHeight = file.height || (isVideo ? 240 : 200);
    
    if (elementWidth > canvasWidth || elementHeight > canvasHeight) {
      const widthRatio = canvasWidth / elementWidth;
      const heightRatio = canvasHeight / elementHeight;
      const scaleFactor = Math.min(widthRatio, heightRatio, 1);
      
      elementWidth = Math.floor(elementWidth * scaleFactor);
      elementHeight = Math.floor(elementHeight * scaleFactor);
    }
    
    const centerX = Math.floor((canvasWidth - elementWidth) / 2);
    const centerY = Math.floor((canvasHeight - elementHeight) / 2);
    
    const command = isVideo ? 'new-video' : 'new-image';
    const commandText = `/${command} --src "${file.name}" --left ${centerX} --top ${centerY} --width ${elementWidth} --height ${elementHeight}`;
    
    addUserMessageToQueue(commandText);
    
    console.log(`🎯 Dropped ${isVideo ? 'video' : 'image'} "${file.name}" on page "${targetPage.name}" - executing: ${commandText}`);
  };

  return (
    <>
      {/* Control Bar */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePlay}
              disabled={!playerReady}
              className={`p-2 rounded-full transition-all ${
                !playerReady 
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
            </button>
            <div className="text-gray-700 dark:text-gray-300 text-sm">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
            {!playerReady && (
              <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                Initializing player...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page-based Timeline */}
      {showTimeline && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          <div className="mb-4">
            <div 
              ref={timelineContainerRef}
              className="overflow-x-auto overflow-y-hidden relative no-scrollbar"
              style={{ maxWidth: '100%' }}
            >
              <div style={{ width: `${getActualTimelineWidth()}px` }}>
                <TimeRuler
                  totalDuration={totalDuration}
                  timelineZoom={timelineZoom}
                  timelineContainerRef={timelineContainerRef}
                  handleTimelineClick={handleTimelineClick}
                />

                <PageTrack
                  compositionData={compositionData}
                  timelineZoom={timelineZoom}
                  getCurrentPage={getCurrentPage}
                  handlePageClick={handlePageClick}
                  formatTime={formatTime}
                  files={files}
                  onFileDropped={handleFileDropped}
                />

                <AudioTimeline 
                  totalProjectDurationFrames={compositionData.pages.reduce((sum, page) => sum + page.duration, 0)}
                  onAudioClick={handleSeek}
                />

                <Playhead
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  isDragging={isDragging}
                  onMouseDown={handlePlayheadMouseDown}
                  getActualTimelineWidth={getActualTimelineWidth}
                  timelineZoom={timelineZoom}
                  totalDuration={totalDuration}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}