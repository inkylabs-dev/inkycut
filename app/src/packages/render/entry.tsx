import { registerRoot, Composition } from 'remotion';
import { MainComposition } from '../../packages/composition';
import React from 'react';

const defaultCompositionData = {
  "pages": [
    {
      "id": "page-1752794556111",
      "name": "Page 1",
      "duration": 150,
      "backgroundColor": "white",
      "elements": []
    }
  ],
  "fps": 30,
  "width": 1920,
  "height": 1080
};

// Create a Root component that sets up compositions
const Root = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainComposition}
        durationInFrames={300} // Default duration, will be overridden by input props
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          data: defaultCompositionData,
          files: [],
          // Remove currentPageIndex to enable multi-page rendering
        }}
        calculateMetadata={({ props }) => {
          // Calculate total duration from all pages, converting milliseconds to frames
          const fps = props.data?.fps || 30;

          const totalDuration = props.data?.pages?.reduce((total: number, page: any) => {
            const durationInFrames = Math.round(((page.duration || 0) / 1000) * fps);
            return total + durationInFrames;
          }, 0) || 300;
          
          return {
            durationInFrames: totalDuration,
            fps: fps,
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