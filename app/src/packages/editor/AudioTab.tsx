import React from 'react';
import { useAtom } from 'jotai';
import { projectAtom, addUserMessageToQueueAtom } from './atoms';
import { CompositionAudio } from '../composition/types';
import DragDropProvider from './DragDropProvider';
import DraggableAudioListItem from './DraggableAudioListItem';
import AudioEditPanel from './AudioEditPanel';

export default function AudioTab() {
  const [project, setProject] = useAtom(projectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);

  // Get selected audio
  const selectedAudioId = project?.appState?.selectedAudioId;
  const selectedAudio = project?.composition?.audios?.find(audio => audio.id === selectedAudioId);

  if (!project?.composition?.audios || project.composition.audios.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audios</h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No audio tracks found</div>
      </div>
    );
  }

  const audios = project.composition.audios;

  const handleDeleteAudio = (audio: CompositionAudio) => {
    const command = `/del-audio --id ${audio.id}`;
    addUserMessageToQueue(command);
  };

  const handleCopyAudioId = (audio: CompositionAudio) => {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern Clipboard API
      navigator.clipboard.writeText(audio.id).catch(() => {
        console.error('Failed to copy audio ID to clipboard');
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = audio.id;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy audio ID to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleMoveAudioBefore = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-audio ${audios[dragIndex].id} --before ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handleMoveAudioAfter = (dragIndex: number, hoverIndex: number) => {
    const diff = hoverIndex - dragIndex;
    const command = `/set-audio ${audios[dragIndex].id} --after ${Math.abs(diff)}`;
    addUserMessageToQueue(command);
  };

  const handleAudioClick = (audio: CompositionAudio) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      appState: {
        ...project.appState,
        selectedAudioId: audio.id
      }
    };
    
    setProject(updatedProject);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audios</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{audios.length} audio{audios.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="space-y-2">
        <DragDropProvider>
          {audios.map((audio, index) => (
            <div key={audio.id}>
              <DraggableAudioListItem
                audio={audio}
                index={index}
                fps={project.composition.fps}
                onDelete={() => handleDeleteAudio(audio)}
                onCopyId={() => handleCopyAudioId(audio)}
                onClick={() => handleAudioClick(audio)}
                isSelected={project.appState?.selectedAudioId === audio.id}
                onMoveAudioBefore={handleMoveAudioBefore}
                onMoveAudioAfter={handleMoveAudioAfter}
              />
              
              {/* Edit Panel for Selected Audio - appears right under the selected audio */}
              {selectedAudio && selectedAudio.id === audio.id && (
                <AudioEditPanel audio={selectedAudio} />
              )}
            </div>
          ))}
        </DragDropProvider>
      </div>
    </div>
  );
}