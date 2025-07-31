import React, { useRef, useEffect } from 'react';

interface PlayheadProps {
  currentFrame: number;
  totalFrames: number;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  getActualTimelineWidth: () => number;
}

export const Playhead: React.FC<PlayheadProps> = ({
  currentFrame,
  totalFrames,
  isDragging,
  onMouseDown,
  getActualTimelineWidth,
}) => {
  const playheadRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={playheadRef}
      className="absolute w-0.5 bg-red-500 z-50 transition-all duration-100 pointer-events-none"
      style={{ 
        left: `${totalFrames > 0 ? (currentFrame / totalFrames) * getActualTimelineWidth() : 0}px`,
        top: '14px',
        height: 'calc(100% - 14px)',
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
      }}
    >
      <div 
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
          transform: isDragging ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.1s ease',
        }}
      />
    </div>
  );
};