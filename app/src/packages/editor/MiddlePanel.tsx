import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { Player, PlayerRef } from '@remotion/player';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  CodeBracketIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { CompositionData, defaultCompositionData } from './types';
import { MainComposition } from './Composition';
import { projectAtom, ensureCompositionIDs, filesAtom } from './atoms';

interface MiddlePanelProps {
  onTimelineUpdate: (timeline: any[]) => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
  onPageSelect?: (page: any) => void;
  isReadOnly?: boolean;
}

export default function MiddlePanel({ onCompositionUpdate, onPageSelect, isReadOnly = false }: MiddlePanelProps) {
  // Use Jotai atoms instead of props
  const [project] = useAtom(projectAtom);
  const [files] = useAtom(filesAtom);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTimeline, ] = useState(true);
  const [viewMode, setViewMode] = useState<'player' | 'code'>('player'); // Always start with player
  const [compositionData, setCompositionData] = useState<CompositionData>(defaultCompositionData);
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [userEditedJson, setUserEditedJson] = useState(false);
  
  const playerRef = useRef<PlayerRef>(null);
  const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store last edited composition to preserve changes when toggling views
  const lastEditedComposition = useRef<CompositionData | null>(null);

  
  // Refs to track previous project state for comparison
  const prevProjectIdRef = useRef<string>('');
  const prevCompositionRef = useRef<string>('');
  
  // Update composition data when project changes, but only if user hasn't made direct edits
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
        setJsonString(JSON.stringify(project.composition, null, 2));
        setUserEditedJson(false);
        
        // Reset our stored edited version too
        lastEditedComposition.current = null;
      } 
      // Otherwise follow our normal update logic
      else if (!userEditedJson) {
        setCompositionData(project.composition);
      } else if (viewMode !== 'code' && !userEditedJson) {
        setCompositionData(project.composition);
      }
    }
    
    // Update refs for next comparison
    prevProjectIdRef.current = currentProjectId;
    prevCompositionRef.current = currentCompositionId;
  }, [project, userEditedJson, viewMode]);
  
  // Initialize JSON string when composition data changes, but avoid unnecessary updates
  useEffect(() => {
    // Always update the JSON string if we're not in code view or there are no user edits
    if (viewMode !== 'code' && !userEditedJson) {
      setJsonString(JSON.stringify(compositionData, null, 2));
    } 
    // Also update if this is first initialization
    else if (jsonString === '') {
      setJsonString(JSON.stringify(compositionData, null, 2));
    }
    // Special case: If we're in code view and project just got reset
    else if (viewMode === 'code' && !userEditedJson && project?.composition) {
      // Check if the JSON differs from what's displayed
      const currentJson = JSON.stringify(project.composition, null, 2);
      if (currentJson !== jsonString) {
        setJsonString(currentJson);
      }
    }
  }, [compositionData, viewMode, jsonString, userEditedJson, project]);
  
  // Calculate total duration and current time
  // Convert page durations from milliseconds to frames
  const totalFrames = compositionData.pages.reduce((sum, page) => sum + Math.round((page.duration / 1000) * compositionData.fps), 0);
  const totalDuration = totalFrames / compositionData.fps;
  const currentTime = currentFrame / compositionData.fps;

  // Player event handlers

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
    }, 50); // Update every 50ms for smoother progress
  }, [totalFrames, playerReady]);

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

  // Reset player when composition data changes
  useEffect(() => {
    if (playerRef.current && playerReady) {
      setIsPlaying(false);
      setCurrentFrame(0);
      stopFrameTracking();
      try {
        playerRef.current.pause();
        playerRef.current.seekTo(0);
      } catch (error) {
        console.error('Error resetting player:', error);
      }
    }
  }, [compositionData, playerReady, stopFrameTracking]);

  // Initialize player when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerRef.current && !playerReady) {
        setPlayerReady(true);
        // console.log('Player manually set to ready');
      }
    }, 1000); // Give the player 1 second to initialize
    
    return () => clearTimeout(timer);
  }, [playerReady]);

  // Calculate current page based on frame
  const getCurrentPage = () => {
    let cumulativeFrames = 0;
    for (let i = 0; i < compositionData.pages.length; i++) {
      const pageDurationInFrames = Math.round((compositionData.pages[i].duration / 1000) * compositionData.fps);
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

  const handleStop = useCallback(() => {
    if (!playerRef.current || !playerReady) {
      console.warn('Player not ready');
      return;
    }

    try {
      playerRef.current.pause();
      playerRef.current.seekTo(0);
      setCurrentFrame(0);
      setIsPlaying(false);
      stopFrameTracking();
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }, [playerReady, stopFrameTracking]);

  const handleSeek = useCallback((frame: number) => {
    if (!playerRef.current || !playerReady) {
      console.warn('Player not ready');
      return;
    }

    try {
      const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));
      playerRef.current.seekTo(clampedFrame);
      setCurrentFrame(clampedFrame);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [totalFrames, playerReady]);

  const handlePageClick = (pageIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    // Calculate the start frame of the clicked page
    let cumulativeFrames = 0;
    for (let i = 0; i < pageIndex; i++) {
      const pageDurationMs = compositionData.pages[i].duration;
      const pageDurationFrames = Math.round((pageDurationMs / 1000) * compositionData.fps);
      cumulativeFrames += pageDurationFrames;
    }
    
    // Calculate the relative position within the clicked block
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const blockWidth = rect.width;
    const relativePosition = clickX / blockWidth; // 0 to 1
    
    // Calculate the frame position within the page
    const pageDurationMs = compositionData.pages[pageIndex].duration;
    const pageDurationFrames = Math.round((pageDurationMs / 1000) * compositionData.fps);
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
    const timelineWidth = rect.width;
    const relativePosition = clickX / timelineWidth; // 0 to 1
    
    const targetFrame = Math.floor(relativePosition * totalFrames);
    handleSeek(targetFrame);
  };

  const [isDragging, setIsDragging] = useState(false);

  const handlePlayheadMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      
      // Find the timeline ruler element
      const timelineRuler = document.querySelector('.timeline-ruler') as HTMLElement;
      if (!timelineRuler) return;
      
      const rect = timelineRuler.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const timelineWidth = rect.width;
      const relativePosition = Math.max(0, Math.min(1, mouseX / timelineWidth));
      
      const targetFrame = Math.floor(relativePosition * totalFrames);
      handleSeek(targetFrame);
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
  }, [isDragging, totalFrames, handleSeek]);

  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      
      // Ensure all pages and elements have IDs before proceeding
      const compositionWithIDs = ensureCompositionIDs(parsed);
      
      // Update local state first for immediate UI update
      setCompositionData(compositionWithIDs);
      setJsonError(null);
      setUserEditedJson(true);
      
      // Store the latest valid edit in our ref for persistence across view switches
      lastEditedComposition.current = { ...compositionWithIDs };
      
      // In offline mode, we automatically save to localStorage
      if (project?.id) {
        localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(compositionWithIDs));
      }
      
      // Then notify parent component to update the project state
      if (onCompositionUpdate) {
        onCompositionUpdate(compositionWithIDs);
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'player' ? 'code' : 'player';
    
    // When switching to player view from code view with valid edits
    if (newMode === 'player' && viewMode === 'code' && userEditedJson && !jsonError) {
      // Ensure all pages and elements have IDs before saving
      const compositionWithIDs = ensureCompositionIDs(compositionData);
      
      // Ensure parent component has the latest data
      if (onCompositionUpdate) {
        onCompositionUpdate(compositionWithIDs);
      }
      
      // Store the edited composition data in the ref
      lastEditedComposition.current = { ...compositionWithIDs };
      
      // In offline mode, we always save changes immediately
      // This allows the player to immediately reflect JSON edits
      if (project?.id) {
        localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(compositionWithIDs));
      }
    }
    
    // When switching back to code view, we have two cases:
    if (newMode === 'code') {
      if (userEditedJson && lastEditedComposition.current) {
        // Case 1: User has edited the JSON - restore their edited version
        setCompositionData(lastEditedComposition.current);
        setJsonString(JSON.stringify(lastEditedComposition.current, null, 2));
      } else {
        // Case 2: No user edits or project was reset - show current composition
        setJsonString(JSON.stringify(compositionData, null, 2));
      }
    }
    
    setViewMode(newMode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const inputProps = useMemo(() => ({
    data: compositionData,
    currentPageIndex: getCurrentPage().pageIndex,
    files: files
  }), [compositionData, currentFrame, files]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Top Toggle Bar */}
      <div className="bg-gray-50 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleViewMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'player' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              <VideoCameraIcon className="h-4 w-4" />
              <span>Player</span>
            </button>
            <button
              onClick={toggleViewMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'code' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              <CodeBracketIcon className="h-4 w-4" />
              <span>Code {isReadOnly ? '(Read-Only)' : ''}</span>
              {userEditedJson && viewMode !== 'code' && !isReadOnly && (
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full ml-1"></span>
              )}
            </button>
          </div>
          <div className="text-gray-800 dark:text-gray-200 text-sm flex items-center">
            {project?.name || 'Untitled Project'}
            {userEditedJson && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Edited)</span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'player' ? (
        <>
          {/* Remotion Player Area */}
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
            <div className="w-full max-w-4xl aspect-video">
              <Player
                ref={playerRef}
                component={MainComposition}
                inputProps={inputProps}
                durationInFrames={totalFrames}
                compositionWidth={compositionData.width}
                compositionHeight={compositionData.height}
                fps={compositionData.fps}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  position: 'relative', // Ensure proper positioning
                }}
                controls={false}
                loop={false}
                autoPlay={false}
                showVolumeControls={false}
                allowFullscreen={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                overflowVisible={true}
                acknowledgeRemotionLicense={true}
              />
            </div>
            
            
          </div>

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
                <button
                  onClick={handleStop}
                  disabled={!playerReady}
                  className={`p-2 rounded-full transition-all ${
                    !playerReady 
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400' 
                      : 'bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 text-white'
                  }`}
                >
                  <StopIcon className="h-5 w-5" />
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
                {/* Time ruler */}
                <div 
                  className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 cursor-pointer timeline-ruler"
                  onClick={handleTimelineClick}
                >
                  {Array.from({ length: Math.ceil(totalDuration / 5) }, (_, i) => (
                    <div
                      key={`time-marker-${i}`}
                      className="absolute top-0 h-full border-l border-gray-400 dark:border-gray-500"
                      style={{ left: `${(i * 5 / totalDuration) * 100}%` }}
                    >
                      <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{i * 5}s</span>
                    </div>
                  ))}
                  
                  {/* Playhead */}
                  <div
                    className="absolute top-0 w-0.5 h-full bg-red-500 z-10 transition-all duration-100"
                    style={{ left: `${totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0}%` }}
                  >
                    <div 
                      className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" 
                      onMouseDown={handlePlayheadMouseDown}
                    />
                  </div>
                </div>

                {/* Pages Track */}
                <div className="overflow-x-auto">
                  <div className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded" style={{ minWidth: '100%' }}>
                    {compositionData.pages.map((page, index) => {
                      const startTime = compositionData.pages
                        .slice(0, index)
                        .reduce((sum, p) => sum + (p.duration / 1000), 0); // Convert ms to seconds
                      const pagesDuration = page.duration / 1000; // Convert ms to seconds
                      const pageColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                      
                      return (
                        <div
                          key={`page-${page.id}`}
                          className="absolute top-1 bottom-1 rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80 border border-gray-300 dark:border-gray-600"
                          style={{
                            left: `${(startTime / totalDuration) * 100}%`,
                            width: `${(pagesDuration / totalDuration) * 100}%`,
                            backgroundColor: pageColors[index % pageColors.length],
                            minWidth: '60px', // Ensure minimum readable width
                          }}
                          onClick={(event) => handlePageClick(index, event)}
                          title={`${page.name} (${formatTime(pagesDuration)})`}
                        >
                          <div className="text-center px-2">
                            <div className="font-medium truncate">{page.name}</div>
                            <div className="text-xs opacity-75">{formatTime(pagesDuration)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Code Editor Area */
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800 dark:text-gray-200 text-lg font-semibold">Composition JSON</h3>
            <div className="flex items-center gap-3">
              {userEditedJson && (
                <div className="text-green-600 dark:text-green-400 text-sm flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-1"></span>
                  Changes applied
                </div>
              )}
              {jsonError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  Error: {jsonError}
                </div>
              )}
            </div>
          </div>
          <textarea
            value={jsonString}
            onChange={isReadOnly ? undefined : (e) => handleJsonChange(e.target.value)}
            readOnly={isReadOnly}
            className={`flex-1 p-4 rounded-lg font-mono text-sm resize-none border focus:outline-none ${
              isReadOnly 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
            }`}
            placeholder={isReadOnly ? "Project JSON (Read-Only)" : "Edit your composition JSON here..."}
            style={{ minHeight: '400px' }}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-gray-600 dark:text-gray-400 text-xs">
              {isReadOnly 
                ? '🔒 This project is shared in read-only mode. You can view the JSON structure but cannot make changes.'
                : '💡 Tip: Edit the JSON directly to modify pages, elements, timing, and styling. Changes are applied in real-time.'
              }
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => {
                  if (project?.composition && userEditedJson) {
                    // Reset to the project's composition data
                    setCompositionData(project.composition);
                    setJsonString(JSON.stringify(project.composition, null, 2));
                    setUserEditedJson(false);
                    
                    // Clear the stored edited version
                    lastEditedComposition.current = null;
                    
                    // Update parent component
                    if (onCompositionUpdate) {
                      onCompositionUpdate(project.composition);
                    }
                    
                    // In offline mode, update the localStorage as well
                    if (project?.id) {
                      localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(project.composition));
                    }
                  }
                }}
                className={`px-3 py-1 rounded text-xs ${
                  userEditedJson 
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                disabled={!userEditedJson}
              >
                Reset Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
