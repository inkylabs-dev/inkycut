import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CompositionPage } from '../composition/types';
import PageListItem from './PageListItem';

interface DragItem {
  type: string;
  pageId: string;
  index: number;
}

interface DraggablePageListItemProps {
  page: CompositionPage;
  index: number;
  fps: number;
  onDelete: () => void;
  onCopyId: () => void;
  onMovePageBefore: (dragIndex: number, hoverIndex: number) => void;
  onMovePageAfter: (dragIndex: number, hoverIndex: number) => void;
}

const ItemType = 'PAGE';

export default function DraggablePageListItem({
  page,
  index,
  fps,
  onDelete,
  onCopyId,
  onMovePageBefore,
  onMovePageAfter
}: DraggablePageListItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, pageId: page.id, index },
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
        onMovePageAfter(dragIndex, hoverIndex);
      } else {
        // Moving up - insert before the hover item
        onMovePageBefore(dragIndex, hoverIndex);
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
      <PageListItem
        page={page}
        fps={fps}
        onDelete={onDelete}
        onCopyId={onCopyId}
      />
    </div>
  );
}