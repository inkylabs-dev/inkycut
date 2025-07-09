import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { InteractiveComposition, CompositionData, CompositionElement, defaultCompositionData } from './Composition';
import { snapToGrid } from './SnapGrid';

// Simplified test data with fewer elements for easier testing
const testCompositionData: CompositionData = {
  fps: 30,
  width: 1920,
  height: 1080,
  pages: [
    {
      id: 'test-page',
      name: 'Test Page',
      duration: 150, // 5 seconds at 30fps
      backgroundColor: '#e0f2fe', // Light blue background
      elements: [
        {
          id: 'test-element1',
          type: 'text',
          x: 400,
          y: 200,
          width: 400,
          height: 100,
          text: 'DRAG ME',
          fontSize: 48,
          color: '#1e40af',
          fontWeight: 'bold',
          textAlign: 'center',
          startTime: 0,
          endTime: 5,
          isDragging: false,
        },
        {
          id: 'test-element2',
          type: 'text',
          x: 400,
          y: 400,
          width: 600,
          height: 80,
          text: 'RESIZE ME',
          fontSize: 36,
          color: '#7e22ce',
          fontWeight: 'bold',
          textAlign: 'center',
          startTime: 0,
          endTime: 5,
          isDragging: false,
        }
      ]
    }
  ]
};

// Demo component that demonstrates interactive drag and drop functionality
export const InteractiveDemo: React.FC = () => {
  // Use test data instead of the default composition data
  const [compositionData, setCompositionData] = useState<CompositionData>(testCompositionData);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [elementPositions, setElementPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [debugInfo, setDebugInfo] = useState<string>('No interactions yet');

  // Track element positions for debugging
  useEffect(() => {
    const positions: Record<string, {x: number, y: number}> = {};
    compositionData.pages.forEach(page => {
      page.elements.forEach(element => {
        positions[element.id] = { x: element.x, y: element.y };
      });
    });
    setElementPositions(positions);
  }, [compositionData]);

  // Move element programmatically for testing
  const moveElement = (elementId: string, deltaX: number, deltaY: number) => {
    handleElementChange(elementId, (element) => ({
      ...element,
      x: element.x + deltaX,
      y: element.y + deltaY,
    }));
  };

  // Handler for element changes (position, size, etc.)
  const handleElementChange = useCallback(
    (elementId: string, updater: (element: CompositionElement) => CompositionElement) => {
      setDebugInfo(`Element ${elementId} changed`);
      
      setCompositionData(prevData => {
        const newData = {
          ...prevData,
          pages: prevData.pages.map(page => ({
            ...page,
            elements: page.elements.map(element => {
              if (element.id === elementId) {
                const updatedElement = updater(element);
                // Log the changes for debugging
                console.log(`Element ${elementId} updated:`, {
                  before: { x: element.x, y: element.y, w: element.width, h: element.height },
                  after: { x: updatedElement.x, y: updatedElement.y, w: updatedElement.width, h: updatedElement.height }
                });
                return updatedElement;
              }
              return element;
            }),
          })),
        };
        return newData;
      });
    },
    []
  );

  // Handler for element selection
  const handleElementSelect = useCallback((elementId: string | null) => {
    setDebugInfo(`Element ${elementId || 'none'} selected`);
    setSelectedElement(elementId);
  }, []);

  // Props for the interactive composition
  const inputProps = useMemo(() => ({
    data: compositionData,
    onElementChange: handleElementChange,
    selectedElement,
    onElementSelect: handleElementSelect,
    currentPageIndex,
  }), [compositionData, handleElementChange, selectedElement, handleElementSelect, currentPageIndex]);

  // Handle keyboard controls for moving elements
  useEffect(() => {
    if (!selectedElement) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;
      
      // Skip if inside input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      const moveDistance = e.shiftKey ? 1 : 10;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveElement(selectedElement, 0, -moveDistance);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveElement(selectedElement, 0, moveDistance);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveElement(selectedElement, -moveDistance, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveElement(selectedElement, moveDistance, 0);
          break;
        case 'Delete':
        case 'Backspace':
          // Future enhancement: delete selected element
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, moveElement]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Interactive Demo (Test Version)</h1>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
          Click and drag elements to move them. Click on an element to select it and use the handles to resize.
        </p>
        
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedElement && (
            <div style={{ fontSize: '14px', color: '#059669', padding: '4px 8px', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>
              Selected: {selectedElement}
            </div>
          )}
          
          <button
            onClick={() => handleElementSelect(selectedElement ? null : 'test-element1')}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {selectedElement ? 'Deselect' : 'Select Element 1'}
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => moveElement('test-element1', -20, 0)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Move Left ←
            </button>
            <button
              onClick={() => moveElement('test-element1', 20, 0)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Move Right →
            </button>
            <button
              onClick={() => moveElement('test-element1', 0, -20)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Move Up ↑
            </button>
            <button
              onClick={() => moveElement('test-element1', 0, 20)}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Move Down ↓
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '14px', fontFamily: 'monospace', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
          <div><strong>Debug:</strong> {debugInfo}</div>
          <div><strong>Element Positions:</strong> {
            Object.entries(elementPositions)
              .map(([id, pos]) => `${id}: (${pos.x}, ${pos.y})`)
              .join(' | ')
          }</div>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f9fafb',
        position: 'relative',
      }}>
        <div style={{ 
          position: 'relative',
          width: '80%', 
          maxWidth: '1200px',
          aspectRatio: '16/9',
          border: '2px solid #cbd5e1',
          overflow: 'visible',
          borderRadius: '8px',
        }}>
          <Player
            component={InteractiveComposition}
            inputProps={inputProps}
            durationInFrames={150}
            compositionWidth={compositionData.width}
            compositionHeight={compositionData.height}
            fps={compositionData.fps}
            style={{
              width: '100%',
              height: '100%',
            }}
            controls={false}
            overflowVisible
          />
        </div>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>Instructions:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563' }}>
          <li>Click on any text element to select it</li>
          <li>Drag selected elements to move them around</li>
          <li>Use the corner handles to resize selected elements</li>
          <li>Click on empty space to deselect</li>
          <li>Use the test buttons above to verify element movement functionality</li>
          <li>Elements snap to grid by default (hold Shift while dragging to disable snapping)</li>
        </ul>

        <h4 style={{ margin: '16px 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>Keyboard Shortcuts:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563' }}>
          <li>Arrow keys: Move selected element (10px at a time)</li>
          <li>Shift + Arrow keys: Fine movement (1px at a time)</li>
          <li>Alt + resize: Maintain aspect ratio while resizing</li>
        </ul>
      </div>
    </div>
  );
};

export default InteractiveDemo;
