import React, { useRef, useEffect } from 'react';

interface PlayheadProps {
  currentFrame: number;
  totalFrames: number;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  getActualTimelineWidth: () => number;
  timelineZoom: number;
  totalDuration: number;
}

export const Playhead: React.FC<PlayheadProps> = ({
  currentFrame,
  totalFrames,
  isDragging,
  onMouseDown,
  getActualTimelineWidth,
  timelineZoom,
  totalDuration,
}) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Calculate playhead position based on project duration, not timeline width
  const playheadPosition = totalDuration > 0 
    ? (currentFrame / totalFrames) * (totalDuration * 100 * timelineZoom) 
    : 0;

  // Apply drag effects using raw CSS manipulation like FileListItem
  useEffect(() => {
    if (handleRef.current) {
      if (isDragging) {
        handleRef.current.style.transform = 'scale(1.2)';
        handleRef.current.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))';
      } else {
        handleRef.current.style.transform = 'scale(1)';
        handleRef.current.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))';
      }
    }
  }, [isDragging]);

  return (
    <div
      ref={playheadRef}
      className="absolute w-0.5 bg-red-500 z-50 pointer-events-none"
      style={{ 
        left: `${playheadPosition}px`,
        top: '14px',
        height: 'calc(100% - 14px)',
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
      }}
    >
      <div 
        ref={handleRef}
        className={`absolute pointer-events-auto ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={onMouseDown}
        style={{ 
          left: '-6px',
          top: '-14px',
          width: '0',
          height: '0',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '12px solid #ef4444',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          transform: 'scale(1)',
        }}
      />
    </div>
  );
};