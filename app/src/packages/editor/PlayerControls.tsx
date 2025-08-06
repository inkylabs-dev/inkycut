import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { PlayerRef } from '@remotion/player';
import { 
  PlayIcon, 
  PauseIcon, 
  CodeBracketIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { CompositionData, defaultCompositionData, LocalFile } from '../composition/types';
import AudioTimeline from './AudioTimeline';
import { Playhead } from './components/Playhead';
import PageTrack from './components/PageTrack';
import TimeRuler from './components/TimeRuler';
import { projectAtom, ensureCompositionIDs, filesAtom, appStateAtom, updateProjectAtom, addUserMessageToQueueAtom, updateAppStateAtom } from './atoms';

interface PlayerControlsProps {
  playerRef: React.RefObject<PlayerRef>;
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
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTimeline, ] = useState(true);
  const [viewMode, setViewMode] = useState<'player' | 'code'>('player');
  const [compositionData, setCompositionData] = useState<CompositionData>(defaultCompositionData);
  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [userEditedJson, setUserEditedJson] = useState(false);
  
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
  const totalFrames = compositionData.pages.reduce((sum, page) => sum + page.duration, 0);
  const totalDuration = totalFrames / compositionData.fps;
  const currentTime = currentFrame / compositionData.fps;

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
    }, 50);
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
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [totalFrames, playerReady, isPlaying, stopFrameTracking]);

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
    const relativePosition = clickX / blockWidth;
    
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
    
    // Calculate position relative to project duration, not full timeline width
    const projectDurationWidth = totalDuration * 100 * timelineZoom;
    const relativePosition = Math.max(0, Math.min(1, clickX / projectDurationWidth));
    
    const targetFrame = Math.floor(relativePosition * totalFrames);
    handleSeek(targetFrame);
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isPageDragging, setIsPageDragging] = useState(false);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingPageIndex, setResizingPageIndex] = useState<number | null>(null);
  const [startResizeWidth, setStartResizeWidth] = useState(0);
  const [startMouseX, setStartMouseX] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(appState.zoomLevel || 1);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to calculate the actual timeline width
  const getActualTimelineWidth = useCallback(() => {
    return Math.max(
      compositionData.pages.reduce((sum, p) => sum + Math.max((p.duration / compositionData.fps) * 100 * timelineZoom, 80), 0), 
      800
    );
  }, [compositionData.pages, timelineZoom]);

  // Auto-scroll helper functions
  const startAutoScroll = useCallback((direction: 'left' | 'right', speed: number = 10) => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
    
    autoScrollIntervalRef.current = setInterval(() => {
      const timelineContainer = timelineContainerRef.current;
      if (!timelineContainer) return;
      
      const scrollAmount = direction === 'right' ? speed : -speed;
      const newScrollLeft = Math.max(0, Math.min(
        timelineContainer.scrollLeft + scrollAmount,
        timelineContainer.scrollWidth - timelineContainer.clientWidth
      ));
      
      timelineContainer.scrollLeft = newScrollLeft;
    }, 16);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const handleAutoScrollOnDrag = useCallback((mouseX: number, containerRect: DOMRect) => {
    const edgeThreshold = 100;
    const maxScrollSpeed = 20;
    
    const leftDistance = mouseX;
    const rightDistance = containerRect.width - mouseX;
    
    if (leftDistance < edgeThreshold && leftDistance >= 0) {
      const intensity = 1 - (leftDistance / edgeThreshold);
      const speed = Math.ceil(intensity * maxScrollSpeed);
      startAutoScroll('left', speed);
    } else if (rightDistance < edgeThreshold && rightDistance >= 0) {
      const intensity = 1 - (rightDistance / edgeThreshold);
      const speed = Math.ceil(intensity * maxScrollSpeed);
      startAutoScroll('right', speed);
    } else {
      stopAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

  const handlePlayheadMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handlePageMouseDown = (event: React.MouseEvent, pageIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isResizeArea = clickX > rect.width - 10;
    
    if (isResizeArea) {
      setIsResizing(true);
      setResizingPageIndex(pageIndex);
      setStartResizeWidth(rect.width);
      setStartMouseX(event.clientX);
    } else {
      setIsPageDragging(true);
      setDraggedPageIndex(pageIndex);
    }
  };

  const handlePageReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newPages = [...compositionData.pages];
    const [movedPage] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, movedPage);
    
    const updatedComposition = {
      ...compositionData,
      pages: newPages
    };
    
    if (project) {
      const updatedProject = {
        ...project,
        composition: updatedComposition
      };
      updateProject(updatedProject);
      
      if (onCompositionUpdate) {
        onCompositionUpdate(updatedComposition);
      }
    }
  };

  const handlePageDurationUpdate = (pageIndex: number, newDuration: number) => {
    const newPages = [...compositionData.pages];
    newPages[pageIndex] = {
      ...newPages[pageIndex],
      duration: Math.max(newDuration, 500)
    };
    
    const updatedComposition = {
      ...compositionData,
      pages: newPages
    };
    
    if (project) {
      const updatedProject = {
        ...project,
        composition: updatedComposition
      };
      updateProject(updatedProject);
      
      if (onCompositionUpdate) {
        onCompositionUpdate(updatedComposition);
      }
    }
  };

  const handleAudioDelayChange = (audioId: string, newDelay: number) => {
    const delayValue = Math.max(0, Math.round(newDelay));
    const slashCommand = `/set-audio --id ${audioId} --delay ${delayValue}`;
    addUserMessageToQueue(slashCommand);
  };

  const handleAudioTrimAfterChange = (audioId: string, newTrimAfter: number, newDuration: number) => {
    const trimAfterValue = Math.max(0, Math.round(newTrimAfter));
    const durationValue = Math.max(0, Math.round(newDuration));
    const slashCommand = `/set-audio --id ${audioId} --trim-after ${trimAfterValue} --duration ${durationValue}`;
    addUserMessageToQueue(slashCommand);
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
      } else if (isPageDragging && draggedPageIndex !== null) {
        const timelineContainer = timelineContainerRef.current;
        if (!timelineContainer) return;
        
        const containerRect = timelineContainer.getBoundingClientRect();
        const mouseX = event.clientX - containerRect.left;
        const scrollLeft = timelineContainer.scrollLeft;
        const adjustedMouseX = mouseX + scrollLeft;
        
        handleAutoScrollOnDrag(mouseX, containerRect);
        
        let cumulativePosition = 0;
        let targetIndex = 0;
        
        for (let i = 0; i < compositionData.pages.length; i++) {
          if (i === draggedPageIndex) {
            continue;
          }
          
          const pageDuration = compositionData.pages[i].duration / compositionData.fps;
          const blockWidth = Math.max(pageDuration * 100 * timelineZoom, 80);
          
          if (adjustedMouseX < cumulativePosition + blockWidth / 2) {
            break;
          }
          
          cumulativePosition += blockWidth;
          targetIndex++;
        }
        
        setDropIndicatorIndex(targetIndex);
      } else if (isResizing && resizingPageIndex !== null) {
        const deltaX = event.clientX - startMouseX;
        const newWidth = Math.max(startResizeWidth + deltaX, 80);
        const newDuration = Math.max((newWidth / (100 * timelineZoom)) * 1000, 500);
        handlePageDurationUpdate(resizingPageIndex, newDuration);
      }
    };

    const handleMouseUp = () => {
      if (isPageDragging && draggedPageIndex !== null) {
        if (dropIndicatorIndex !== null) {
          handlePageReorder(draggedPageIndex, dropIndicatorIndex);
        }
      }
      
      setIsDragging(false);
      setIsPageDragging(false);
      setDraggedPageIndex(null);
      setDropIndicatorIndex(null);
      setIsResizing(false);
      setResizingPageIndex(null);
      stopAutoScroll();
    };

    if (isDragging || isPageDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isPageDragging, isResizing, draggedPageIndex, dropIndicatorIndex, resizingPageIndex, startResizeWidth, startMouseX, totalFrames, handleSeek, timelineZoom, compositionData.pages, handleAutoScrollOnDrag, stopAutoScroll]);

  // Cleanup auto-scroll on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

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

  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      const compositionWithIDs = ensureCompositionIDs(parsed);
      setCompositionData(compositionWithIDs);
      setJsonError(null);
      setUserEditedJson(true);
      lastEditedComposition.current = { ...compositionWithIDs };
      
      if (project?.id) {
        localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(compositionWithIDs));
      }
      
      if (onCompositionUpdate) {
        onCompositionUpdate(compositionWithIDs);
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'player' ? 'code' : 'player';
    
    if (newMode === 'player' && viewMode === 'code' && userEditedJson && !jsonError) {
      const compositionWithIDs = ensureCompositionIDs(compositionData);
      
      if (onCompositionUpdate) {
        onCompositionUpdate(compositionWithIDs);
      }
      
      lastEditedComposition.current = { ...compositionWithIDs };
      
      if (project?.id) {
        localStorage.setItem(`vibe-project-composition-${project.id}`, JSON.stringify(compositionWithIDs));
      }
    }
    
    if (newMode === 'code') {
      if (userEditedJson && lastEditedComposition.current) {
        setCompositionData(lastEditedComposition.current);
        setJsonString(JSON.stringify(lastEditedComposition.current, null, 2));
      } else {
        setJsonString(JSON.stringify(compositionData, null, 2));
      }
    }
    
    setViewMode(newMode);
  };

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
      {/* Top Toggle Bar */}
      <div className="bg-gray-50 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleViewMode}
              data-testid="toggle-player-mode"
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
              data-testid="toggle-code-view"
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

      {viewMode === 'player' ? (
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
                      handlePageMouseDown={handlePageMouseDown}
                      isPageDragging={isPageDragging}
                      draggedPageIndex={draggedPageIndex}
                      dropIndicatorIndex={dropIndicatorIndex}
                      isResizing={isResizing}
                      resizingPageIndex={resizingPageIndex}
                      setIsResizing={setIsResizing}
                      setResizingPageIndex={setResizingPageIndex}
                      setStartResizeWidth={setStartResizeWidth}
                      setStartMouseX={setStartMouseX}
                      formatTime={formatTime}
                      files={files}
                      onFileDropped={handleFileDropped}
                    />

                    <AudioTimeline 
                      audios={compositionData.audios || []} 
                      timelineZoom={timelineZoom}
                      onAudioDelayChange={handleAudioDelayChange}
                      onAudioTrimAfterChange={handleAudioTrimAfterChange}
                      files={files}
                      totalProjectDurationFrames={compositionData.pages.reduce((sum, page) => sum + page.duration, 0)}
                      fps={compositionData.fps}
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
                    setCompositionData(project.composition);
                    setJsonString(JSON.stringify(project.composition, null, 2));
                    setUserEditedJson(false);
                    lastEditedComposition.current = null;
                    
                    if (onCompositionUpdate) {
                      onCompositionUpdate(project.composition);
                    }
                    
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
    </>
  );
}