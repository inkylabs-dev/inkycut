---
title: Timeline Control
description: Complete guide to timeline controls in InkyCut - playback, page management, and interactive editing features
---

This document describes the timeline control system in InkyCut, which provides intuitive video playback controls and interactive page management capabilities.

## Overview

The timeline is the central control interface for managing your video composition. It displays all pages in sequence and provides visual feedback for timing, duration, and playback state. The timeline supports both keyboard shortcuts and mouse interactions for efficient editing.

## Playback Controls

### Play/Pause Functionality

The timeline includes standard video playback controls for previewing your composition:

#### Play Button
- **Location**: Left side of the timeline control bar
- **Function**: Starts playback from the current position
- **Visual State**: Shows a play icon (▶️) when paused, pause icon (⏸️) when playing
- **Behavior**: Plays through all pages in sequence according to their durations

#### Pause Button
- **Location**: Same as play button (toggles between play/pause states)
- **Function**: Stops playback and maintains current position
- **Visual State**: Shows pause icon (⏸️) when playing
- **Behavior**: Immediately stops playback without resetting position

#### Keyboard Shortcut
- **Key**: `Spacebar`
- **Function**: Toggles between play and pause states
- **Scope**: Works when timeline or canvas area has focus
- **Convenience**: Allows quick playback control without mouse interaction

### Playback Behavior

**Sequential Playback**: Pages play in order from left to right according to their durations
**Duration Respect**: Each page displays for its specified duration before advancing
**Loop Behavior**: Playback stops at the end of the composition (no automatic looping)
**Position Indicator**: A playback cursor shows current position during playback

## Page Management

### Drag to Reorder

The timeline supports intuitive drag-and-drop functionality for rearranging pages:

#### How to Reorder Pages
1. **Click and Hold**: Click on any page in the timeline and hold the mouse button
2. **Drag**: Move the mouse left or right to the desired position
3. **Visual Feedback**: The page being dragged appears highlighted or elevated
4. **Drop Zone**: Other pages shift to show where the page will be inserted
5. **Release**: Release the mouse button to place the page in the new position

#### Visual Indicators
- **Drag State**: Page becomes semi-transparent or highlighted during drag
- **Drop Preview**: Gap appears between pages to show insertion point
- **Invalid Areas**: Areas where dropping is not allowed are visually indicated
- **Snap Zones**: Pages snap to valid positions for precise placement

#### Constraints
- **Minimum Pages**: Cannot reorder if composition has only one page
- **Boundaries**: Pages cannot be dragged outside the timeline area
- **Live Update**: Project updates immediately when page order changes

### Resize to Set Duration

Pages can be resized horizontally to adjust their duration visually:

#### Duration Editing Process
1. **Hover**: Position mouse over the right edge of a page block
2. **Cursor Change**: Mouse cursor changes to a resize cursor (↔️)
3. **Click and Drag**: Click and drag horizontally to adjust page width
4. **Real-time Feedback**: Page duration updates in real-time as you drag
5. **Release**: Release mouse to commit the new duration

#### Visual Feedback
- **Resize Cursor**: Horizontal resize cursor appears when hovering over page edges
- **Live Preview**: Page width changes immediately during drag operation
- **Duration Display**: Current duration shows in tooltip or page header during resize
- **Grid Alignment**: Pages may snap to timeline grid for precise timing

#### Duration Constraints
- **Minimum Duration**: Pages cannot be resized below a minimum duration (typically 0.1 seconds)
- **Maximum Duration**: Practical maximum based on project requirements
- **Precision**: Duration changes respect timeline zoom level for fine adjustments
- **Update Project**: Duration changes immediately update the project composition

## Timeline Zoom

### Zoom Controls

The timeline provides zoom functionality for detailed editing:

#### Zoom Methods
- **Mouse Wheel**: Ctrl/Cmd + scroll wheel to zoom in/out
- **Zoom Slider**: Visual slider control for precise zoom adjustment
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + Plus (+)`: Zoom in
  - `Ctrl/Cmd + Minus (-)`: Zoom out
  - `Ctrl/Cmd + 0`: Reset to 100% zoom
- **Slash Command**: `/zoom-tl <percentage>` for exact zoom levels

#### Zoom Behavior
- **Range**: 10% to 1000% zoom levels
- **Center Point**: Zooms around the current playback position or timeline center
- **Page Detail**: Higher zoom shows more page detail and enables precise duration editing
- **Scrolling**: Timeline becomes horizontally scrollable when zoomed in beyond container width

## Interactive Features

### Page Selection

Pages can be selected for editing and property modification:

#### Selection Methods
- **Click**: Single click on a page to select it
- **Keyboard**: Arrow keys to navigate between pages
- **Visual State**: Selected page is highlighted with distinct border/background

#### Selection Benefits
- **Property Editing**: Selected page properties can be modified via commands or UI panels
- **Context Actions**: Right-click menus and toolbar actions apply to selected page
- **Keyboard Shortcuts**: Page-specific shortcuts work on the currently selected page

### Timeline Navigation

#### Scrubbing
- **Click**: Click anywhere on the timeline to jump to that position
- **Drag**: Drag the playback cursor to scrub through the composition
- **Preview**: Content updates in real-time during scrubbing

#### Precision Editing
- **Frame Accuracy**: Timeline zoom enables frame-by-frame precision
- **Grid Snapping**: Pages and cursors can snap to timeline grid marks
- **Time Indicators**: Timestamps show exact timing information

## Keyboard Shortcuts Summary

| Shortcut | Action | Description |
|----------|---------|-------------|
| `Spacebar` | Play/Pause | Toggle playback state |
| `Ctrl/Cmd + Wheel` | Zoom Timeline | Zoom in/out on timeline |
| `Ctrl/Cmd + Plus (+)` | Zoom In | Increase timeline zoom |
| `Ctrl/Cmd + Minus (-)` | Zoom Out | Decrease timeline zoom |
| `Ctrl/Cmd + 0` | Reset Zoom | Return to 100% zoom |
| `Left Arrow` | Previous Page | Select previous page |
| `Right Arrow` | Next Page | Select next page |
| `Home` | First Page | Jump to first page |
| `End` | Last Page | Jump to last page |

## Technical Implementation

### Performance Optimization

- **Efficient Rendering**: Timeline only re-renders when necessary
- **Smooth Playback**: Optimized for smooth 60fps playback
- **Responsive Interaction**: Low-latency response to user inputs
- **Memory Management**: Efficient handling of large compositions

### Browser Compatibility

- **Modern Browsers**: Full support in Chrome, Firefox, Safari, Edge
- **Touch Devices**: Touch-friendly controls for tablets and mobile devices
- **Accessibility**: Keyboard navigation and screen reader support

### Integration Points

- **Project State**: Timeline reflects and updates project composition
- **Command System**: Integrates with slash commands for programmatic control
- **AI Assistant**: Timeline state is accessible to AI for automated editing
- **Export System**: Timeline settings affect video export timing

## Best Practices

### Efficient Workflow

1. **Plan First**: Outline your composition structure before detailed timing
2. **Use Zoom**: Zoom in for precise duration adjustments, zoom out for overview
3. **Keyboard Shortcuts**: Learn keyboard shortcuts for faster editing
4. **Preview Often**: Use spacebar to frequently preview your work

### Duration Management

1. **Consistent Timing**: Keep similar content types at similar durations
2. **Transition Consideration**: Account for transition time between pages
3. **Pacing**: Vary page durations to create dynamic pacing
4. **Total Length**: Monitor total composition length for target video duration

### Organization

1. **Logical Order**: Arrange pages in a logical narrative sequence
2. **Grouping**: Group related pages together for easier management
3. **Naming**: Use descriptive page names for easier identification
4. **Backup**: Save frequently when making major timeline changes

## Troubleshooting

### Common Issues

**Playback Problems:**
- Ensure all media files are properly loaded
- Check browser performance and close unnecessary tabs
- Verify internet connection for external media

**Interaction Issues:**
- Clear browser cache if controls become unresponsive
- Check that JavaScript is enabled
- Ensure browser is updated to latest version

**Performance Issues:**
- Reduce timeline zoom if experiencing lag
- Limit number of pages for better performance
- Use local files instead of remote URLs when possible

This timeline control system provides a comprehensive and intuitive interface for managing video compositions, combining familiar video editing paradigms with modern web interaction patterns for an efficient editing experience.
