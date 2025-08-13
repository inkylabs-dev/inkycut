import React, { useRef } from 'react';
import { useAtom } from 'jotai';
import { Player } from '@remotion/player';
import type { CompositionData } from '../composition/types';
import { PlayerWrapper } from './PlayerWrapper';
import PlayerControls from './PlayerControls';
import { projectAtom, filesAtom } from './atoms';

interface MiddlePanelProps {
  onTimelineUpdate: (timeline: any[]) => void;
  onCompositionUpdate?: (composition: CompositionData) => void;
  onPageSelect?: (page: any) => void;
  isReadOnly?: boolean;
  enableControls?: boolean;
}

export default function MiddlePanel({ onCompositionUpdate, onPageSelect, isReadOnly = false, enableControls = true }: MiddlePanelProps) {
  const [project] = useAtom(projectAtom);
  const [files] = useAtom(filesAtom);
  const playerRef = useRef<React.ComponentRef<typeof Player>>(null);

  // Get composition data from project, with fallback to default
  const compositionData = project?.composition || { pages: [], fps: 30, width: 1920, height: 1080, audios: [] };
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Stable Player Wrapper */}
      <PlayerWrapper 
        ref={playerRef}
        compositionData={compositionData}
        files={files}
      />
      
      {/* All user interactions and controls */}
      { enableControls ? <PlayerControls 
        playerRef={playerRef}
        onTimelineUpdate={() => {}}
        onCompositionUpdate={onCompositionUpdate}
        onPageSelect={onPageSelect}
        isReadOnly={isReadOnly}
      /> : null }
    </div>
  );
}
