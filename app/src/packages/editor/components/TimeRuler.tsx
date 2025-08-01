import React from 'react';

interface TimeRulerProps {
  totalDuration: number;
  timelineZoom: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  handleTimelineClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function TimeRuler({
  totalDuration,
  timelineZoom,
  timelineContainerRef,
  handleTimelineClick
}: TimeRulerProps) {
  return (
    <div 
      className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 cursor-pointer timeline-ruler"
      onClick={handleTimelineClick}
      style={{ width: '100%' }}
    >
      {(() => {
        // Calculate appropriate time interval to show 4-5 markers in visible area
        const containerWidth = timelineContainerRef.current?.clientWidth || 800;
        const visibleDuration = containerWidth / (100 * timelineZoom); // visible seconds
        
        // Choose interval to show ~4-5 markers in visible area
        let interval = 1;
        if (visibleDuration > 20) interval = 10;
        else if (visibleDuration > 10) interval = 5;
        else if (visibleDuration > 5) interval = 2;
        else interval = 1;
        
        const markers: React.ReactElement[] = [];
        for (let time = 0; time <= totalDuration; time += interval) {
          const markerPosition = time * 100 * timelineZoom;
          markers.push(
            <div
              key={`time-marker-${time}`}
              className="absolute top-0 h-full border-l border-gray-400 dark:border-gray-500"
              style={{ left: `${markerPosition}px` }}
            >
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{time}s</span>
            </div>
          );
        }
        return markers;
      })()}
    </div>
  );
}