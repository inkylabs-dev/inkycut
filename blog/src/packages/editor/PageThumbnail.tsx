import React, { useMemo } from 'react';
import { Player } from '@remotion/player';
import { useAtom } from 'jotai';
import type { CompositionPage, LocalFile } from '../composition/types';
import { MainComposition } from '../composition';

interface PageThumbnailProps {
  page: CompositionPage;
  files: LocalFile[];
  width?: number;
  height?: number;
}

export default function PageThumbnail({ 
  page, 
  files, 
  width = 80, 
  height = 45 
}: PageThumbnailProps) {
  // Create a mini composition with just this page
  const thumbnailComposition = useMemo(() => ({
    pages: [page],
    fps: 30, // Use a standard fps for thumbnails
    width: 1920, // Standard composition dimensions
    height: 1080,
    audios: []
  }), [page]);

  const inputProps = useMemo(() => ({
    data: thumbnailComposition,
    files: files || []
  }), [thumbnailComposition, files]);

  return (
    <div 
      className="bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <Player
        component={MainComposition}
        inputProps={inputProps}
        durationInFrames={Math.max(1, page.duration)} // Ensure at least 1 frame
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls={false}
        loop={false}
        autoPlay={false}
        showVolumeControls={false}
        allowFullscreen={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        overflowVisible={false}
        acknowledgeRemotionLicense={true}
        initialFrame={0} // Always show first frame
      />
    </div>
  );
}