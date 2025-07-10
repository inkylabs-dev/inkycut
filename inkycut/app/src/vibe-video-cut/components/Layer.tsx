import React from 'react';
import { Sequence } from 'remotion';
import type { ElementRendererProps } from './types';
 
interface LayerProps extends ElementRendererProps {
  children: React.ReactNode;
}

export const Layer: React.FC<LayerProps> = ({ element, frame, fps, children }) => {
  // Calculate from and durationInFrames based on startTime and endTime (which are in seconds)
  const startTime = element.startTime || 0;
  const endTime = element.endTime || Infinity;
  
  // Convert seconds to frames
  const fromFrame = Math.round(startTime * fps);
  const durationInFrames = endTime !== Infinity 
    ? Math.round((endTime - startTime) * fps) 
    : undefined;
  
  return (
    <Sequence
      key={element.id}
      from={fromFrame}
      durationInFrames={durationInFrames}
      layout="none"
    >
      {children}
    </Sequence>
  );
};