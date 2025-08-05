import React, { useRef, useEffect, useState } from 'react';
import { Thumbnail } from '@remotion/player';
import { CompositionData, CompositionPage, LocalFile } from '../../composition/types';
import { MainComposition } from '../../composition';

interface PageThumbnailProps {
  page: CompositionPage;
  pageIndex: number;
  compositionData: CompositionData;
  width: number;
  height: number;
  files?: LocalFile[];
  className?: string;
  style?: React.CSSProperties;
}

export default function PageThumbnail({
  page,
  pageIndex,
  compositionData,
  width,
  height,
  files,
  className = '',
  style = {}
}: PageThumbnailProps) {

  // Always show just one thumbnail at the beginning of the page
  const layout = {
    count: 1,
    width: width,
    height: height,
    spacing: 0
  };

  // Create a simplified composition data with just this page
  const singlePageComposition: CompositionData = {
    ...compositionData,
    pages: [page]
  };


  return (
    <div
      className={`relative ${className}`}
      style={{
        ...style,
        width: width,
        height: height,
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* Single thumbnail at the beginning of the page */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: layout.width,
          height: layout.height,
          margin: 0,
          padding: 0,
          border: 'none',
          overflow: 'hidden'
        }}
      >
        <Thumbnail
          component={MainComposition}
          compositionWidth={compositionData.width}
          compositionHeight={compositionData.height}
          frameToDisplay={0} // Show first frame of the page
          durationInFrames={Math.floor((page.duration / 1000) * compositionData.fps)}
          fps={compositionData.fps}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            margin: 0,
            padding: 0,
            border: 'none'
          }}
          inputProps={{
            data: singlePageComposition,
            currentPageIndex: 0,
            files: files
          }}
        />
      </div>
    </div>
  );
}