---
title: Project Schema
description: Complete reference for InkyCut's project data structure and JSON schema
---

InkyCut projects are represented as JSON objects that contain all the data needed to recreate and render video compositions. This schema is designed to be simple, extensible, and compatible with open-source rendering engines.

## Project Structure

A project consists of multiple **pages** (scenes), each containing **elements** (text, images, videos) with positioning, styling, and animation properties.

```json
{
  "id": "project-123",
  "name": "My Video",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z",
  "propertiesEnabled": true,
  "composition": {
    "fps": 30,
    "width": 1920,
    "height": 1080,
    "pages": [
      {
        "id": "page-1",
        "name": "Intro",
        "duration": 5000,
        "backgroundColor": "#1e3a8a",
        "elements": [
          {
            "id": "text-1",
            "type": "text",
            "left": 100,
            "top": 200,
            "width": 800,
            "height": 100,
            "text": "Welcome to InkyCut",
            "fontSize": 48,
            "color": "#ffffff",
            "fontWeight": "bold",
            "textAlign": "center",
            "animation": {
              "props": { "scale": [1, 1.2] },
              "duration": 1000,
              "ease": "easeInOut",
              "alternate": true,
              "loop": true,
              "autoplay": true
            }
          }
        ]
      }
    ]
  },
  "appState": {
    "selectedElementId": null,
    "selectedPageId": "page-1",
    "viewMode": "edit",
    "zoomLevel": 1,
    "showGrid": false,
    "isLoading": false,
    "error": null,
    "history": {
      "past": [],
      "future": []
    }
  },
  "files": [
    {
      "id": "file-1",
      "name": "logo.png",
      "type": "image/png",
      "size": 12345,
      "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "timeline": [],
    "version": "1.0"
  }
}
```

## Schema Reference

### Project

The root object representing a complete video editing project.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | `string` | Unique identifier for the project | ✓ |
| `name` | `string` | User-assigned name of the project | ✓ |
| `createdAt` | `string` | ISO timestamp when the project was created | ✓ |
| `updatedAt` | `string` | ISO timestamp when the project was last updated | ✓ |
| `propertiesEnabled` | `boolean` | Whether properties panel is enabled | ✓ |
| `composition` | [`CompositionData`](#compositiondata) | The actual video composition data | ✓ |
| `appState` | [`AppState`](#appstate) | Current application state for this project | ✓ |
| `files` | [`LocalFile[]`](#localfile) | Local files stored in the project | ✓ |
| `metadata` | `object` | Optional additional metadata | |

### CompositionData

Contains the core video composition structure with pages and global settings.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `pages` | [`CompositionPage[]`](#compositionpage) | Array of all pages in the composition | ✓ |
| `fps` | `number` | Frames per second for the entire composition | ✓ |
| `width` | `number` | Width of the composition canvas in pixels | ✓ |
| `height` | `number` | Height of the composition canvas in pixels | ✓ |

### CompositionPage

Represents a distinct section/scene in the composition. Each page contains its own set of elements and duration.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | `string` | Unique identifier for the page | ✓ |
| `name` | `string` | User-friendly name for the page | ✓ |
| `duration` | `number` | Duration of the page in milliseconds (defaults to 5000ms if not provided) | |
| `backgroundColor` | `string` | Background color of the page (CSS color value) | |
| `elements` | [`CompositionElement[]`](#compositionelement) | Array of elements that appear on this page | ✓ |

### CompositionElement

Represents a visual element in the composition. Elements can be videos, images, text, or groups that are positioned and styled within the composition timeline.

**Note for Group Elements**: Child elements within a group use absolute positioning relative to the group container. The group automatically calculates its scale based on the natural bounds of its children versus the allocated group dimensions. Child elements maintain their original left/top/width/height values, and the entire group is scaled to fit within the specified group boundaries.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | `string` | Unique identifier for the element | ✓ |
| `type` | `'video' \| 'image' \| 'text' \| 'group'` | Type of element | ✓ |
| `left` | `number` | X position from left edge (in pixels) | ✓ |
| `top` | `number` | Y position from top edge (in pixels) | ✓ |
| `width` | `number` | Element width in pixels | ✓ |
| `height` | `number` | Element height in pixels | ✓ |
| `rotation` | `number` | Rotation angle in degrees (clockwise) | |
| `opacity` | `number` | Opacity value from 0 (transparent) to 1 (fully visible) | |
| `zIndex` | `number` | Stack order - higher values appear above lower values | |
| `delay` | `number` | Delay before element appears (in milliseconds) | |
| `src` | `string` | Source URL for video or image elements | |
| `elements` | [`CompositionElement[]`](#compositionelement) | Child elements for group elements (positioned absolutely within group container, auto-scaled to fit) | |
| `text` | `string` | Content of a text element | |
| `fontSize` | `number` | Font size in pixels | |
| `fontFamily` | `string` | Font family name | |
| `color` | `string` | Text color in CSS format (hex, rgba, etc.) | |
| `fontWeight` | `string` | Font weight (bold, normal, etc.) | |
| `textAlign` | `'left' \| 'center' \| 'right'` | Horizontal text alignment | |
| `isDragging` | `boolean` | Whether element is currently being dragged by user | |
| `animation` | [`AnimationConfig`](#animationconfig) | Animation configuration | |

### AnimationConfig

Animation configuration compatible with anime.js for element animations.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `props` | `Record<string, any>` | Animation parameters (CSS properties, transforms, variables) | |
| `duration` | `number` | Animation duration in milliseconds | |
| `ease` | `string` | Animation easing function | |
| `delay` | `number` | Animation delay in milliseconds | |
| `alternate` | `boolean` | Animation direction | |
| `loop` | `boolean \| number` | Animation loop settings | |
| `autoplay` | `boolean` | Auto-play animation | |

### AppState

Represents the UI state of the application, including UI preferences, selections, and transient states.

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `selectedElementId` | `string \| null` | ID of the currently selected element | ✓ |
| `selectedPageId` | `string \| null` | ID of the currently selected page | ✓ |
| `viewMode` | `'edit' \| 'preview'` | Current view mode | ✓ |
| `zoomLevel` | `number` | Current zoom level of the canvas (1 = 100%) | ✓ |
| `showGrid` | `boolean` | Whether to show the alignment grid | ✓ |
| `isLoading` | `boolean` | Whether the app is currently loading data | ✓ |
| `error` | `string \| null` | Error message if there's a problem | ✓ |
| `history` | `object` | Undo/redo history for the project | ✓ |

### LocalFile

Represents a file stored locally in the project. Files are stored as data URLs (base64 encoded).

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | `string` | Unique identifier for the file | ✓ |
| `name` | `string` | Original filename | ✓ |
| `type` | `string` | MIME type of the file | ✓ |
| `size` | `number` | File size in bytes | ✓ |
| `dataUrl` | `string` | Data URL containing the file content | ✓ |
| `createdAt` | `string` | ISO timestamp when file was added | ✓ |

## Usage Examples

### Creating a Simple Text Animation

```json
{
  "id": "text-fade-in",
  "type": "text",
  "left": 100,
  "top": 200,
  "width": 600,
  "height": 80,
  "text": "Hello World",
  "fontSize": 36,
  "color": "#ffffff",
  "animation": {
    "props": { "opacity": [0, 1] },
    "duration": 1000,
    "ease": "easeOutQuad",
    "autoplay": true
  }
}
```

### Adding an Image with Scaling Animation

```json
{
  "id": "logo-bounce",
  "type": "image",
  "left": 400,
  "top": 300,
  "width": 200,
  "height": 200,
  "src": "/logo.png",
  "animation": {
    "props": { "scale": [0.8, 1.2, 1] },
    "duration": 800,
    "ease": "easeOutElastic",
    "autoplay": true
  }
}
```

### Creating a Group Element with Child Elements

```json
{
  "id": "title-card",
  "type": "group",
  "left": 100,
  "top": 100,
  "width": 600,
  "height": 200,
  "elements": [
    {
      "id": "title-text",
      "type": "text",
      "left": 50,
      "top": 20,
      "width": 400,
      "height": 60,
      "text": "Welcome",
      "fontSize": 48,
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    {
      "id": "subtitle-text",
      "type": "text",
      "left": 50,
      "top": 100,
      "width": 350,
      "height": 40,
      "text": "to InkyCut",
      "fontSize": 32,
      "color": "#cccccc"
    }
  ],
  "animation": {
    "props": { "opacity": [0, 1] },
    "duration": 1000,
    "ease": "easeInOut",
    "autoplay": true
  }
}
```


In this example, the child elements have a natural width of 450px (400 + 50) and height of 140px (100 + 40). The group will automatically scale these elements to fit within the 600×200 group boundaries.*

See the example project [here](https://inkycut.com/shared/590368c0-013b-428e-b109-16026c242b85#key=NDDwhk6acgSO3zo8gWOiW_YUKysVDA7ZMFOq8Wpj6rI).

## Rendering Compatibility

The schema prioritizes simplicity and extensibility, making it easy to add new element types and animation properties without breaking existing implementations.

InkyCut offers CLI and web-based rendering capability (under construction). We also welcome contributions to the open-source rendering engine, which can be used to visualize and export projects in various formats.
