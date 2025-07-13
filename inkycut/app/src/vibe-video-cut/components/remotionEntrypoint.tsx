import { registerRoot, Composition } from 'remotion';
import { VideoComposition } from './Composition';
import { defaultCompositionData } from './types';
import React from 'react';

// Create a Root component that sets up compositions
const Root = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition}
        durationInFrames={300} // Default duration, will be overridden by input props
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          data: defaultCompositionData,
          // Remove currentPageIndex to enable multi-page rendering
        }}
        calculateMetadata={({ props }) => {
          // Calculate total duration from all pages
          const totalDuration = props.data?.pages?.reduce((total: number, page: any) => {
            return total + (page.duration || 0);
          }, 0) || 300;
          
          return {
            durationInFrames: totalDuration,
            fps: props.data?.fps || 30,
            width: props.data?.width || 1920,
            height: props.data?.height || 1080,
          };
        }}
      />
    </>
  );
};

// Register the Root component for Remotion
registerRoot(Root);

// Export components for use in other files
export { Root };