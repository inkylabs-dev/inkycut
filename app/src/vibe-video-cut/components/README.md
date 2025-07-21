# Interactive Video Composition Editor

This implementation adds interactive editing capabilities to the Remotion video composition system, allowing users to manipulate elements directly on the canvas and through property controls.

## Features

- **Interactive Editing**: Modify elements through both direct manipulation and property controls
- **Drag and Drop**: Click and drag elements to move them around the canvas
- **Resize Handles**: Select an element to see resize handles at the corners
- **Editable Properties**: All element properties can be edited through the LeftPanel
- **Visual Feedback**: Selected elements show a blue outline and hover effects; edited properties highlight briefly
- **Element Selection**: Click on elements to select them, click empty space to deselect
- **Multiple Element Types**: Supports text, image, and video elements
- **Time-based Visibility**: Elements respect their `startTime` and `endTime` properties
- **Scaling Support**: Works correctly with Player scaling using `useCurrentScale()`
- **Undo/Redo System**: Full history tracking with keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
- **Rotation Control**: Rotate elements using the rotation property control
- **Z-index Management**: Control the stacking order of elements with z-index controls
- **Visual Feedback**: Elements and property inputs show visual feedback when modified

## Usage

### Basic Interactive Composition

```tsx
import { Player } from '@remotion/player';
import { InteractiveComposition, CompositionData, CompositionElement } from './Composition';

function MyVideoEditor() {
  const [compositionData, setCompositionData] = useState<CompositionData>(myData);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const handleElementChange = useCallback(
    (elementId: string, updater: (element: CompositionElement) => CompositionElement) => {
      setCompositionData((prevData) => ({
        ...prevData,
        pages: prevData.pages.map((page) => ({
          ...page,
          elements: page.elements.map((element) => {
            if (element.id === elementId) {
              return updater(element);
            }
            return element;
          }),
        })),
      }));
    },
    []
  );

  const handleElementSelect = useCallback((elementId: string | null) => {
    setSelectedElement(elementId);
  }, []);

  return (
    <Player
      component={InteractiveComposition}
      inputProps={{
        data: compositionData,
        onElementChange: handleElementChange,
        selectedElement,
        onElementSelect: handleElementSelect,
      }}
      durationInFrames={300}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      controls={false} // Disable built-in controls
      overflowVisible // Make outlines visible outside canvas
    />
  );
}
```

### Non-Interactive Composition

For regular video rendering without interactivity:

```tsx
import { Player } from '@remotion/player';
import { VideoComposition, CompositionData } from './Composition';

function MyVideoPlayer() {
  const [compositionData] = useState<CompositionData>(myData);

  return (
    <Player
      component={VideoComposition}
      inputProps={{ data: compositionData }}
      durationInFrames={300}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
    />
  );
}
```

## Key Components

### CompositionElement Interface

Extended to include `isDragging` property:

```tsx
interface CompositionElement {
  id: string;
  type: 'video' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging?: boolean; // NEW: Track dragging state
  // ... other properties
}
```

### InteractiveComposition Component

Main component that renders the interactive canvas:

- Handles element positioning and sizing
- Manages selection state
- Renders interactive outlines and resize handles
- Supports time-based element visibility

### Key Features

1. **Element Dragging**: Click and drag elements to reposition them
2. **Resize Handles**: Four corner handles appear when an element is selected
3. **Visual Feedback**: Blue outline for selected/hovered elements
4. **Deselection**: Click empty space to deselect current element
5. **Scale Awareness**: Properly handles Player scaling transformations
6. **Property Editing**: The LeftPanel allows editing of all element properties:
   - Position & Size: x, y, width, height
   - Transforms: rotation, z-index (layer order)
   - Timing: startTime, endTime
   - Text-specific: text content, fontSize, color, fontWeight, textAlign
   - Video-specific: src, opacity
7. **History Management**: Full undo/redo system with keyboard shortcuts
   - Undo (Cmd/Ctrl+Z)
   - Redo (Cmd/Ctrl+Shift+Z)
   - Save (Cmd/Ctrl+S)
8. **Auto-Save**: Changes automatically saved after 10 seconds of inactivity
9. **Visual Feedback**: Recently edited properties highlight with blue background
10. **Input Validation**: Prevents invalid values (negative sizes, etc.)

## Event Handling

The implementation uses pointer events for cross-platform compatibility:

- `onPointerDown`: Initiate drag or resize operations
- `onPointerMove`: Update element position/size during drag
- `onPointerUp`: Complete drag operation and update state
- `e.stopPropagation()`: Prevent event bubbling for proper interaction

## Browser Compatibility

- Uses modern pointer events (supported in all modern browsers)
- Handles both mouse and touch interactions
- Properly disables text selection and page scrolling during drag operations

## Performance Considerations

- Uses `useCallback` and `useMemo` for performance optimization
- Minimal re-renders during drag operations
- Proper cleanup of event listeners

## Demo

See `InteractiveDemo.tsx` for a complete working example with:
- Page navigation
- Element selection indicators
- User instructions
- Responsive layout

This implementation provides a solid foundation for building interactive video editing interfaces with Remotion.
