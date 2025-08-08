import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CompositionElement } from '../composition/types';
import ElementListItem from './ElementListItem';

interface DragItem {
  type: string;
  elementId: string;
  index: number;
}

interface DraggableElementListItemProps {
  element: CompositionElement;
  index: number;
  onDelete: () => void;
  onCopyId: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  onMoveElementBefore: (dragIndex: number, hoverIndex: number) => void;
  onMoveElementAfter: (dragIndex: number, hoverIndex: number) => void;
}

const ItemType = 'ELEMENT';

export default function DraggableElementListItem({
  element,
  index,
  onDelete,
  onCopyId,
  onClick,
  isSelected = false,
  onMoveElementBefore,
  onMoveElementAfter
}: DraggableElementListItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, elementId: element.id, index },
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
        onMoveElementAfter(dragIndex, hoverIndex);
      } else {
        // Moving up - insert before the hover item
        onMoveElementBefore(dragIndex, hoverIndex);
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
      <ElementListItem
        element={element}
        onDelete={onDelete}
        onCopyId={onCopyId}
        onClick={onClick}
        isSelected={isSelected}
      />
    </div>
  );
}