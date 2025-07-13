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
          currentPageIndex: 0
        }}
      />
    </>
  );
};

// Register the Root component for Remotion
registerRoot(Root);

// Export components for use in other files
export { Root };