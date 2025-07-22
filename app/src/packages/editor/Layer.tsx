import React from 'react';
import { Sequence } from 'remotion';
import type { ElementRendererProps } from './types';
 
interface LayerProps extends ElementRendererProps {
  children: React.ReactNode;
  isPlayerContext?: boolean;
}

export const Layer: React.FC<LayerProps> = (props) => {
  const { element, fps, children, isPlayerContext = false } = props;
  
  // If not in Player context, just return the children directly
  if (!isPlayerContext) {
    return <>{children}</>;
  }
  
  // Calculate from and durationInFrames based on delay (which is in milliseconds)
  const delayMs = element.delay || 0;
  
  // Convert milliseconds to frames
  const fromFrame = Math.round((delayMs / 1000) * fps);
  // For now, use a default duration if not specified - this will be improved when we add element duration
  const durationInFrames = undefined; // Let Remotion handle default duration
  
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