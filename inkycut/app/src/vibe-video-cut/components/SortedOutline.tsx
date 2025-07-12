import React from 'react';
import {Sequence} from 'remotion';
import {SelectionOutline} from './SelectionOutline';
import type {CompositionElement} from './types';
 
const displaySelectedItemOnTop = (
  items: CompositionElement[],
  selectedItem: string | null,
): CompositionElement[] => {
  const selectedItems = items.filter((item) => item.id === selectedItem);
  const unselectedItems = items.filter((item) => item.id !== selectedItem);
 
  return [...unselectedItems, ...selectedItems];
};
 
export const SortedOutlines: React.FC<{
  items: CompositionElement[];
  selectedItem: string | null;
  changeItem: (elementId: string, updater: (item: CompositionElement) => CompositionElement) => void;
  setSelectedItem: (elementId: string | null) => void;
}> = ({items, selectedItem, changeItem, setSelectedItem}) => {
//   console.log("SortedOutlines rendering:", { 
//     itemsCount: items.length, 
//     selectedItem, 
//     hasChangeItem: !!changeItem,
//     hasSetSelectedItem: !!setSelectedItem
//   });

  const itemsToDisplay = React.useMemo(
    () => displaySelectedItemOnTop(items, selectedItem),
    [items, selectedItem],
  );
 
  const isDragging = React.useMemo(
    () => items.some((item) => item.isDragging),
    [items],
  );
 
return itemsToDisplay.map((item) => {
    const sequenceProps: {
        layout: "none";
        from?: number;
        durationInFrames?: number;
    } = {
        layout: "none",
    };

    // BUG: should not use `item.startTime` and `item.endTime` directly
    // need to apply fps.
    if (typeof item.startTime === "number" && typeof item.endTime === "number") {
        sequenceProps.from = item.startTime;
        sequenceProps.durationInFrames = item.endTime - item.startTime;
    }

    return (
        <Sequence key={item.id} {...sequenceProps}>
            <SelectionOutline
                changeCompositionElement={changeItem}
                compositionElement={item}
                setSelectedElement={setSelectedItem}
                selectedElement={selectedItem}
                isDragging={isDragging}
            />
        </Sequence>
    );
});
};