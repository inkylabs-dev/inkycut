import React, { forwardRef, useMemo } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { CompositionData, LocalFile } from '../composition/types';
import { MainComposition } from '../composition';

interface PlayerWrapperProps {
  compositionData: CompositionData;
  files?: LocalFile[];
}

export const PlayerWrapper = forwardRef<PlayerRef, PlayerWrapperProps>(
  ({ compositionData, files }, ref) => {
    // Memoize inputProps to prevent unnecessary re-renders
    const inputProps = useMemo(() => ({
      data: compositionData,
      files: files || []
    }), [compositionData, files]);

    // Calculate total frames once - ensure integer result
    const totalFrames = useMemo(() => {
      const total = compositionData.pages.reduce((sum, page) => sum + page.duration, 0);
      // Use Math.floor to ensure we get a proper integer and avoid floating-point precision issues
      return Math.floor(total);
    }, [compositionData.pages]);

    return (
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
        <div className="w-full max-w-4xl aspect-video">
          <Player
            ref={ref}
            component={MainComposition}
            inputProps={inputProps}
            durationInFrames={totalFrames}
            compositionWidth={compositionData.width}
            compositionHeight={compositionData.height}
            fps={compositionData.fps}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              position: 'relative',
            }}
            controls={false}
            loop={false}
            autoPlay={false}
            showVolumeControls={false}
            allowFullscreen={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            overflowVisible={true}
            acknowledgeRemotionLicense={true}
          />
        </div>
      </div>
    );
  }
);

PlayerWrapper.displayName = 'PlayerWrapper';