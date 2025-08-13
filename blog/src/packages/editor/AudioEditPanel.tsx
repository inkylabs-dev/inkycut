import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { projectAtom, addUserMessageToQueueAtom } from './atoms';
import type { CompositionAudio } from '../composition/types';
import Input from './components/Input';
import Switch from './components/Switch';

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
  const [editMuted, setEditMuted] = useState(false);
  const [editLoop, setEditLoop] = useState(false);

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
    setEditMuted(audio.muted);
    setEditLoop(audio.loop);
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

  const handleMutedChange = (newMuted: boolean) => {
    setEditMuted(newMuted);
  };

  const handleLoopChange = (newLoop: boolean) => {
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
    if (editMuted !== audio.muted) {
      const command = `/set-audio --id ${audio.id} --muted ${editMuted}`;
      addUserMessageToQueue(command);
    }
  };

  const handleLoopBlur = () => {
    if (editLoop !== audio.loop) {
      const command = `/set-audio --id ${audio.id} --loop ${editLoop}`;
      addUserMessageToQueue(command);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      <div className="p-6 space-y-6">
        {/* Basic Properties */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Basic Properties</h4>
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Timing */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Timing</h4>
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Trimming */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Trimming</h4>
          <div className="space-y-4">
            <Input
              label="Trim Start"
              value={editTrimBefore}
              type="number"
              placeholder="0.0"
              unit="seconds"
              step={0.1}
              min={0}
              onChange={handleTrimBeforeChange}
              onBlur={handleTrimBeforeBlur}
            />
            <Input
              label="Trim End"
              value={editTrimAfter}
              type="number"
              placeholder="0.0"
              unit="seconds"
              step={0.1}
              min={0}
              onChange={handleTrimAfterChange}
              onBlur={handleTrimAfterBlur}
            />
          </div>
        </div>

        {/* Effects */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Effects</h4>
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Audio Options */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Audio Options</h4>
          <div className="space-y-4">
            <Switch
              label="Muted"
              checked={editMuted}
              onChange={handleMutedChange}
              onBlur={handleMutedBlur}
              description="Silence this audio track"
            />
            <Switch
              label="Loop"
              checked={editLoop}
              onChange={handleLoopChange}
              onBlur={handleLoopBlur}
              description="Repeat this audio continuously"
            />
          </div>
        </div>
      </div>
    </div>
  );
}