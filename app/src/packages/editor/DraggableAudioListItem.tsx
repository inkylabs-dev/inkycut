import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CompositionAudio } from '../composition/types';
import AudioListItem from './AudioListItem';

interface DragItem {
  type: string;
  audioId: string;
  index: number;
}

interface DraggableAudioListItemProps {
  audio: CompositionAudio;
  index: number;
  fps: number;
  onDelete: () => void;
  onCopyId: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  onMoveAudioBefore: (dragIndex: number, hoverIndex: number) => void;
  onMoveAudioAfter: (dragIndex: number, hoverIndex: number) => void;
}

const ItemType = 'AUDIO';

export default function DraggableAudioListItem({
  audio,
  index,
  fps,
  onDelete,
  onCopyId,
  onClick,
  isSelected = false,
  onMoveAudioBefore,
  onMoveAudioAfter
}: DraggableAudioListItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, audioId: audio.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      if (dragIndex < hoverIndex) {
        // Moving down - insert after the hover item
        onMoveAudioAfter(dragIndex, hoverIndex);
      } else {
        // Moving up - insert before the hover item
        onMoveAudioBefore(dragIndex, hoverIndex);
      }

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    }
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className={`transition-opacity ${isDragging ? 'scale-95' : ''}`}
    >
      <AudioListItem
        audio={audio}
        fps={fps}
        onDelete={onDelete}
        onCopyId={onCopyId}
        onClick={onClick}
        isSelected={isSelected}
      />
    </div>
  );
}