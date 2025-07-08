import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { MyComposition, VideoComposition, defaultCompositionData, CompositionData } from './Composition';

interface MiddlePanelProps {
  project: any;
  selectedElement: any;
  onTimelineUpdate: (timeline: any[]) => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
}

export default function MiddlePanel({ project, selectedElement, onTimelineUpdate, onCompositionUpdate }: MiddlePanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showTimeline, setShowTimeline] = useState(true);
  const [viewMode, setViewMode] = useState<'player' | 'code'>('player');
  const [compositionData, setCompositionData] = useState<CompositionData>(defaultCompositionData);
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  
  const playerRef = useRef<PlayerRef>(null);
  const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize JSON string when composition data changes
  useEffect(() => {
    setJsonString(JSON.stringify(compositionData, null, 2));
  }, [compositionData]);
  
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

  const handlePageClick = (pageIndex: number) => {
    let cumulativeFrames = 0;
    for (let i = 0; i < pageIndex; i++) {
      cumulativeFrames += compositionData.pages[i].duration;
    }
    handleSeek(cumulativeFrames);
  };

  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      setCompositionData(parsed);
      setJsonError(null);
      if (onCompositionUpdate) {
        onCompositionUpdate(parsed);
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'player' ? 'code' : 'player');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            </button>
          </div>
          <div className="text-white text-sm">
            {project?.name || 'Untitled Project'}
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
                inputProps={{ data: compositionData }}
                durationInFrames={totalFrames}
                compositionWidth={compositionData.width}
                compositionHeight={compositionData.height}
                fps={compositionData.fps}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                }}
                controls={false}
                loop={false}
                autoPlay={false}
                showVolumeControls={false}
                allowFullscreen={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
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
                <h3 className="text-white text-sm font-semibold mb-2">Pages Timeline</h3>
                
                {/* Time ruler */}
                <div className="relative h-6 bg-gray-700 rounded mb-2">
                  {Array.from({ length: Math.ceil(totalDuration / 5) }, (_, i) => (
                    <div
                      key={i}
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
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-32 text-white text-xs truncate mr-2">
                      Pages
                    </div>
                    <div className="flex-1 relative h-12 bg-gray-700 rounded">
                      {compositionData.pages.map((page, index) => {
                        const startTime = compositionData.pages
                          .slice(0, index)
                          .reduce((sum, p) => sum + p.duration, 0) / compositionData.fps;
                        const pagesDuration = page.duration / compositionData.fps;
                        const pageColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
                        
                        return (
                          <div
                            key={page.id}
                            className="absolute top-1 bottom-1 rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80 border border-white border-opacity-20"
                            style={{
                              left: `${(startTime / totalDuration) * 100}%`,
                              width: `${(pagesDuration / totalDuration) * 100}%`,
                              backgroundColor: pageColors[index % pageColors.length],
                            }}
                            onClick={() => handlePageClick(index)}
                            title={`${page.name} (${formatTime(pagesDuration)})`}
                          >
                            <div className="text-center">
                              <div className="font-medium">{page.name}</div>
                              <div className="text-xs opacity-75">{formatTime(pagesDuration)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
            {jsonError && (
              <div className="text-red-400 text-sm">
                Error: {jsonError}
              </div>
            )}
          </div>
          <textarea
            value={jsonString}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="flex-1 bg-gray-800 text-white p-4 rounded-lg font-mono text-sm resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Edit your composition JSON here..."
            style={{ minHeight: '400px' }}
          />
          <div className="mt-4 text-gray-400 text-xs">
            💡 Tip: Edit the JSON directly to modify pages, elements, timing, and styling. Changes are applied in real-time.
          </div>
        </div>
      )}
    </div>
  );
}
