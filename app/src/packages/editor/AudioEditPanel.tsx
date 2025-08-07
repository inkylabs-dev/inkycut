import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { projectAtom, addUserMessageToQueueAtom } from './atoms';
import { CompositionAudio } from '../composition/types';
import Input from './components/Input';

interface AudioEditPanelProps {
  audio: CompositionAudio;
}

export default function AudioEditPanel({ audio }: AudioEditPanelProps) {
  const [project] = useAtom(projectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);
  
  // Local state for edit panel inputs
  const [editVolume, setEditVolume] = useState('');
  const [editDelay, setEditDelay] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTrimBefore, setEditTrimBefore] = useState('');
  const [editTrimAfter, setEditTrimAfter] = useState('');
  const [editPlaybackRate, setEditPlaybackRate] = useState('');
  const [editToneFrequency, setEditToneFrequency] = useState('');
  const [editMuted, setEditMuted] = useState('false');
  const [editLoop, setEditLoop] = useState('false');

  // Update edit inputs when selected audio changes
  useEffect(() => {
    setEditVolume((audio.volume * 100).toString()); // Convert to percentage
    const fps = project?.composition?.fps || 30;
    setEditDelay((audio.delay / fps).toString()); // Convert frames to seconds
    setEditDuration((audio.duration / fps).toString()); // Convert frames to seconds
    setEditTrimBefore((audio.trimBefore / fps).toString());
    setEditTrimAfter((audio.trimAfter / fps).toString());
    setEditPlaybackRate(audio.playbackRate.toString());
    setEditToneFrequency(audio.toneFrequency.toString());
    setEditMuted(audio.muted.toString());
    setEditLoop(audio.loop.toString());
  }, [audio, project?.composition?.fps]);

  // Handle edit panel input changes (only update local state)
  const handleVolumeChange = (newVolume: string) => {
    setEditVolume(newVolume);
  };

  const handleDelayChange = (newDelay: string) => {
    setEditDelay(newDelay);
  };

  const handleDurationChange = (newDuration: string) => {
    setEditDuration(newDuration);
  };

  const handleTrimBeforeChange = (newTrimBefore: string) => {
    setEditTrimBefore(newTrimBefore);
  };

  const handleTrimAfterChange = (newTrimAfter: string) => {
    setEditTrimAfter(newTrimAfter);
  };

  const handlePlaybackRateChange = (newPlaybackRate: string) => {
    setEditPlaybackRate(newPlaybackRate);
  };

  const handleToneFrequencyChange = (newToneFrequency: string) => {
    setEditToneFrequency(newToneFrequency);
  };

  const handleMutedChange = (newMuted: string) => {
    setEditMuted(newMuted);
  };

  const handleLoopChange = (newLoop: string) => {
    setEditLoop(newLoop);
  };

  // Handle blur events (update project state)
  const handleVolumeBlur = () => {
    if (editVolume.trim()) {
      const volume = parseFloat(editVolume);
      if (!isNaN(volume) && volume >= 0 && volume <= 100 && volume !== audio.volume * 100) {
        const command = `/set-audio --id ${audio.id} --volume ${volume / 100}`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleDelayBlur = () => {
    if (editDelay.trim()) {
      const delay = parseFloat(editDelay);
      const fps = project?.composition?.fps || 30;
      const currentDelayInSeconds = audio.delay / fps;
      if (!isNaN(delay) && delay >= 0 && delay !== currentDelayInSeconds) {
        const command = `/set-audio --id ${audio.id} --delay ${delay}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleDurationBlur = () => {
    if (editDuration.trim()) {
      const duration = parseFloat(editDuration);
      const fps = project?.composition?.fps || 30;
      const currentDurationInSeconds = audio.duration / fps;
      if (!isNaN(duration) && duration > 0 && duration !== currentDurationInSeconds) {
        const command = `/set-audio --id ${audio.id} --duration ${duration}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleTrimBeforeBlur = () => {
    if (editTrimBefore.trim()) {
      const trimBefore = parseFloat(editTrimBefore);
      const fps = project?.composition?.fps || 30;
      const currentTrimBeforeInSeconds = audio.trimBefore / fps;
      if (!isNaN(trimBefore) && trimBefore >= 0 && trimBefore !== currentTrimBeforeInSeconds) {
        const command = `/set-audio --id ${audio.id} --trim-before ${trimBefore}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleTrimAfterBlur = () => {
    if (editTrimAfter.trim()) {
      const trimAfter = parseFloat(editTrimAfter);
      const fps = project?.composition?.fps || 30;
      const currentTrimAfterInSeconds = audio.trimAfter / fps;
      if (!isNaN(trimAfter) && trimAfter >= 0 && trimAfter !== currentTrimAfterInSeconds) {
        const command = `/set-audio --id ${audio.id} --trim-after ${trimAfter}s`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handlePlaybackRateBlur = () => {
    if (editPlaybackRate.trim()) {
      const playbackRate = parseFloat(editPlaybackRate);
      if (!isNaN(playbackRate) && playbackRate > 0 && playbackRate !== audio.playbackRate) {
        const command = `/set-audio --id ${audio.id} --playback-rate ${playbackRate}`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleToneFrequencyBlur = () => {
    if (editToneFrequency.trim()) {
      const toneFrequency = parseFloat(editToneFrequency);
      if (!isNaN(toneFrequency) && toneFrequency >= 0.01 && toneFrequency <= 2 && toneFrequency !== audio.toneFrequency) {
        const command = `/set-audio --id ${audio.id} --tone-frequency ${toneFrequency}`;
        addUserMessageToQueue(command);
      }
    }
  };

  const handleMutedBlur = () => {
    if (editMuted !== audio.muted.toString()) {
      const command = `/set-audio --id ${audio.id} --muted ${editMuted}`;
      addUserMessageToQueue(command);
    }
  };

  const handleLoopBlur = () => {
    if (editLoop !== audio.loop.toString()) {
      const command = `/set-audio --id ${audio.id} --loop ${editLoop}`;
      addUserMessageToQueue(command);
    }
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Edit Audio</h4>
      
      <div className="space-y-2">
        {/* Volume Input */}
        <Input
          label="Volume"
          value={editVolume}
          type="number"
          placeholder="100"
          unit="%"
          step={1}
          min={0}
          max={100}
          onChange={handleVolumeChange}
          onBlur={handleVolumeBlur}
        />

        {/* Delay Input */}
        <Input
          label="Delay"
          value={editDelay}
          type="number"
          placeholder="0.0"
          unit="seconds"
          step={0.1}
          min={0}
          onChange={handleDelayChange}
          onBlur={handleDelayBlur}
        />

        {/* Duration Input */}
        <Input
          label="Duration"
          value={editDuration}
          type="number"
          placeholder="0.0"
          unit="seconds"
          step={0.1}
          min={0.1}
          onChange={handleDurationChange}
          onBlur={handleDurationBlur}
        />

        {/* Trim Before Input */}
        <Input
          label="Trim Before"
          value={editTrimBefore}
          type="number"
          placeholder="0.0"
          unit="seconds"
          step={0.1}
          min={0}
          onChange={handleTrimBeforeChange}
          onBlur={handleTrimBeforeBlur}
        />

        {/* Trim After Input */}
        <Input
          label="Trim After"
          value={editTrimAfter}
          type="number"
          placeholder="0.0"
          unit="seconds"
          step={0.1}
          min={0}
          onChange={handleTrimAfterChange}
          onBlur={handleTrimAfterBlur}
        />

        {/* Playback Rate Input */}
        <Input
          label="Playback Rate"
          value={editPlaybackRate}
          type="number"
          placeholder="1.0"
          unit="x"
          step={0.1}
          min={0.1}
          max={3}
          onChange={handlePlaybackRateChange}
          onBlur={handlePlaybackRateBlur}
        />

        {/* Tone Frequency Input */}
        <Input
          label="Tone Frequency"
          value={editToneFrequency}
          type="number"
          placeholder="1.0"
          step={0.01}
          min={0.01}
          max={2}
          onChange={handleToneFrequencyChange}
          onBlur={handleToneFrequencyBlur}
        />

        {/* Muted Select */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Muted:
          </label>
          <select
            value={editMuted}
            onChange={(e) => handleMutedChange(e.target.value)}
            onBlur={handleMutedBlur}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>

        {/* Loop Select */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Loop:
          </label>
          <select
            value={editLoop}
            onChange={(e) => handleLoopChange(e.target.value)}
            onBlur={handleLoopBlur}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      </div>
    </div>
  );
}