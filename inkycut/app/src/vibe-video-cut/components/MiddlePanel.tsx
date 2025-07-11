import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Player, PlayerRef } from '@remotion/player';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  SpeakerWaveIcon,
  Bars3Icon,
  CodeBracketIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { CompositionElement, CompositionData, defaultCompositionData } from './types';
import { VideoComposition } from './Composition';
import { fromTheme } from 'tailwind-merge';
import { projectAtom, selectedElementAtom, selectedPageAtom } from '../atoms';

interface MiddlePanelProps {
  onTimelineUpdate: (timeline: any[]) => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
  onPageSelect?: (page: any) => void;
}

export default function MiddlePanel({ onTimelineUpdate, onCompositionUpdate, onPageSelect }: MiddlePanelProps) {
  // Use Jotai atoms instead of props
  const [project] = useAtom(projectAtom);
  const [selectedElement] = useAtom(selectedElementAtom);
  
  // Always enabled
  const propertiesEnabled = true;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showTimeline, setShowTimeline] = useState(true);
  const [viewMode, setViewMode] = useState<'player' | 'code'>('player');
  const [compositionData, setCompositionData] = useState<CompositionData>(defaultCompositionData);
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [userEditedJson, setUserEditedJson] = useState(false);
  const [currentEditingElement, setCurrentEditingElement] = useState<string | null>(null);
  
  const playerRef = useRef<PlayerRef>(null);
  const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store last edited composition to preserve changes when toggling views
  const lastEditedComposition = useRef<CompositionData | null>(null);

  // Sync selectedElement from props with local state
//   useEffect(() => {
//     console.log('Selected element from props:', selectedElement);
//     console.log('Current editing element:', currentEditingElement);
    
//     if (selectedElement?.id && selectedElement.id !== currentEditingElement) {
//       console.log('Updating currentEditingElement to:', selectedElement.id);
//       setCurrentEditingElement(selectedElement.id);
//     } else if (!selectedElement && currentEditingElement) {
//       // If parent component clears selection, we should clear too
//       console.log('Clearing currentEditingElement');
//       setCurrentEditingElement(null);
//     }
//   }, [selectedElement, currentEditingElement]);
  
  // Update composition data when project changes, but only if user hasn't made direct edits
  useEffect(() => {
    if (project?.composition && !userEditedJson) {
      setCompositionData(project.composition);
    } else if (project?.composition && viewMode !== 'code') {
      // Don't reset the edit flag - we need to keep track of edits across view changes
      // If we have user edits, keep using the user's version
      if (!userEditedJson) {
        setCompositionData(project.composition);
      }
    }
  }, [project, userEditedJson, viewMode]);
  
  // Initialize JSON string when composition data changes, but avoid unnecessary updates
  useEffect(() => {
    // Avoid updating JSON string in these cases:
    // 1. We're in code view (to prevent overwriting user's active edits)
    // 2. User has made edits and we're just switching views
    if ((viewMode !== 'code' && !userEditedJson) || jsonString === '') {
      setJsonString(JSON.stringify(compositionData, null, 2));
    }
  }, [compositionData, viewMode, jsonString, userEditedJson]);
  
  // Calculate total duration and current time
  const totalFrames = compositionData.pages.reduce((sum, page) => sum + page.duration, 0);
  const totalDuration = totalFrames / compositionData.fps;
  const currentTime = currentFrame / compositionData.fps;

  // Player event handlers
  const handlePlayerReady = useCallback(() => {
    console.log('Player ready');
    setPlayerReady(true);
    setCurrentFrame(0);
  }, []);

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
        console.log('Player manually set to ready');
      }
    }, 1000); // Give the player 1 second to initialize
    
    return () => clearTimeout(timer);
  }, [playerReady]);

  // Calculate current page based on frame
  const getCurrentPage = () => {
    let cumulativeFrames = 0;
    for (let i = 0; i < compositionData.pages.length; i++) {
      if (currentFrame < cumulativeFrames + compositionData.pages[i].duration) {
        return { pageIndex: i, frameOffset: currentFrame - cumulativeFrames };
      }
      cumulativeFrames += compositionData.pages[i].duration;
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
        // Clear any current editing selection when starting playback
        setCurrentEditingElement(null);
        
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
      // Clear any current editing selection
      setCurrentEditingElement(null);
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

  const handlePageClick = (pageIndex: number) => {
    let cumulativeFrames = 0;
    for (let i = 0; i < pageIndex; i++) {
      cumulativeFrames += compositionData.pages[i].duration;
    }
    handleSeek(cumulativeFrames);
    
    // Call onPageSelect with the selected page
    if (onPageSelect && compositionData.pages[pageIndex]) {
      onPageSelect(compositionData.pages[pageIndex]);
    }
  };

  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      // Update local state first for immediate UI update
      setCompositionData(parsed);
      setJsonError(null);
      setUserEditedJson(true);
      
      // Store the latest valid edit in our ref for persistence across view switches
      lastEditedComposition.current = { ...parsed };
      
      // In offline mode, we automatically save to localStorage
      if (project?.id) {
        localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(parsed));
      }
      
      // Then notify parent component to update the project state
      if (onCompositionUpdate) {
        onCompositionUpdate(parsed);
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'player' ? 'code' : 'player';
    
    // When switching to player view from code view with valid edits
    if (newMode === 'player' && viewMode === 'code' && userEditedJson && !jsonError) {
      // Ensure parent component has the latest data
      if (onCompositionUpdate) {
        onCompositionUpdate(compositionData);
      }
      
      // Store the edited composition data in the ref
      lastEditedComposition.current = { ...compositionData };
      
      // In offline mode, we always save changes immediately
      // This allows the player to immediately reflect JSON edits
      localStorage.setItem(`vibe-project-composition-${project?.id}`, JSON.stringify(compositionData));
    }
    
    // When switching back to code view, restore the last edited version if available
    if (newMode === 'code' && userEditedJson && lastEditedComposition.current) {
      // Make sure we're using the stored edited version
      setCompositionData(lastEditedComposition.current);
      
      // Update the JSON string to match our stored version
      setJsonString(JSON.stringify(lastEditedComposition.current, null, 2));
    }
    
    setViewMode(newMode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleElementSelect = useCallback((elementId: string | null) => {
    setCurrentEditingElement(elementId);
    
    // Optionally propagate selection to parent component if needed
    if (onPageSelect && elementId) {
      // Find the element to provide to parent
      const element = compositionData.pages
        .flatMap(page => page.elements)
        .find(el => el.id === elementId);
      
      if (element) {
        onPageSelect(element);
      }
    }
  }, [compositionData.pages, onPageSelect]);

  const handleElementChange = useCallback((elementId: string, updater: (element: CompositionElement) => CompositionElement) => {
    // Create a deep copy of compositionData to avoid direct state mutation
    const updatedComposition = JSON.parse(JSON.stringify(compositionData)) as CompositionData;
    
    // Find and update the element
    updatedComposition.pages = updatedComposition.pages.map(page => ({
      ...page,
      elements: page.elements.map(element => {
        if (element.id === elementId) {
          return updater(element);
        }
        return element;
      }),
    }));
    
    // Update local state
    setCompositionData(updatedComposition);
    setJsonString(JSON.stringify(updatedComposition, null, 2));
    handleJsonChange(JSON.stringify(updatedComposition, null, 2));
    setUserEditedJson(true);
    console.log('Element changed:', elementId, updatedComposition.pages[0].elements[0].left);
    
    // Store the latest valid edit in our ref for persistence across view switches
    lastEditedComposition.current = { ...updatedComposition };
    
    // Notify parent component of the update
    if (onCompositionUpdate) {
      onCompositionUpdate(updatedComposition);
    }
    
    // Save to localStorage if project has an id
    if (project?.id) {
      localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(updatedComposition));
    }
  }, [compositionData, onCompositionUpdate, project?.id]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Top Toggle Bar */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleViewMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'player' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
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
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              <CodeBracketIcon className="h-4 w-4" />
              <span>Code</span>
              {userEditedJson && viewMode !== 'code' && (
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full ml-1"></span>
              )}
            </button>
          </div>
          <div className="text-white text-sm flex items-center">
            {project?.name || 'Untitled Project'}
            {userEditedJson && (
              <span className="ml-2 text-xs text-green-400">(Edited)</span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'player' ? (
        <>
          {/* Remotion Player Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div className="w-full max-w-4xl aspect-video">
              <Player
                ref={playerRef}
                component={VideoComposition}
                inputProps={{ 
                  data: compositionData,
                  currentPageIndex: getCurrentPage().pageIndex,
                  setSelectedItem: handleElementSelect,
                  changeItem: handleElementChange,
                  selectedItem: currentEditingElement
                }}
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
              />
            </div>
            
            {/* Play progress overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black bg-opacity-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-white text-sm mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
                <div 
                  className="w-full bg-gray-600 rounded-full h-2 cursor-pointer hover:h-3 transition-all"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const targetFrame = Math.floor(percentage * totalFrames);
                    handleSeek(targetFrame);
                  }}
                >
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-100"
                    style={{ width: `${totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Interactive editing functionality implemented in the InteractiveComposition component */}
          </div>

          {/* Control Bar */}
          <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlay}
                  disabled={!playerReady}
                  className={`p-2 rounded-full transition-all ${
                    !playerReady 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
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
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 hover:bg-gray-700'
                  } text-white`}
                >
                  <StopIcon className="h-5 w-5" />
                </button>
                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </div>
                {!playerReady && (
                  <div className="text-yellow-400 text-sm">
                    Initializing player...
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <SpeakerWaveIcon className="h-5 w-5 text-white" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded"
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Page-based Timeline */}
          {showTimeline && (
            <div className="bg-gray-800 p-4 border-t border-gray-700 max-h-64 overflow-y-auto">
              <div className="mb-4">
                {/* Time ruler */}
                <div className="relative h-6 bg-gray-700 rounded mb-2">
                  {Array.from({ length: Math.ceil(totalDuration / 5) }, (_, i) => (
                    <div
                      key={`time-marker-${i}`}
                      className="absolute top-0 h-full border-l border-gray-500"
                      style={{ left: `${(i * 5 / totalDuration) * 100}%` }}
                    >
                      <span className="text-xs text-gray-300 ml-1">{i * 5}s</span>
                    </div>
                  ))}
                  
                  {/* Playhead */}
                  <div
                    className="absolute top-0 w-0.5 h-full bg-red-500 z-10 transition-all duration-100"
                    style={{ left: `${totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                </div>

                {/* Pages Track */}
                <div className="overflow-x-auto">
                  <div className="relative h-12 bg-gray-700 rounded" style={{ minWidth: '100%' }}>
                    {compositionData.pages.map((page, index) => {
                      const startTime = compositionData.pages
                        .slice(0, index)
                        .reduce((sum, p) => sum + p.duration, 0) / compositionData.fps;
                      const pagesDuration = page.duration / compositionData.fps;
                      const pageColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                      
                      return (
                        <div
                          key={`page-${page.id}`}
                          className="absolute top-1 bottom-1 rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80 border border-white border-opacity-20"
                          style={{
                            left: `${(startTime / totalDuration) * 100}%`,
                            width: `${(pagesDuration / totalDuration) * 100}%`,
                            backgroundColor: pageColors[index % pageColors.length],
                            minWidth: '60px', // Ensure minimum readable width
                          }}
                          onClick={() => handlePageClick(index)}
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
        <div className="flex-1 flex flex-col bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-lg font-semibold">Composition JSON</h3>
            <div className="flex items-center gap-3">
              {userEditedJson && (
                <div className="text-green-400 text-sm flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Changes applied
                </div>
              )}
              {jsonError && (
                <div className="text-red-400 text-sm">
                  Error: {jsonError}
                </div>
              )}
            </div>
          </div>
          <textarea
            value={jsonString}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="flex-1 bg-gray-800 text-white p-4 rounded-lg font-mono text-sm resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Edit your composition JSON here..."
            style={{ minHeight: '400px' }}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-gray-400 text-xs">
              💡 Tip: Edit the JSON directly to modify pages, elements, timing, and styling. Changes are applied in real-time.
            </div>
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
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!userEditedJson}
            >
              Reset Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
