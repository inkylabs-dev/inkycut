# Element Preview with File Resolution

## Overview
The ElementPreview component now properly displays image and video previews for page elements that reference local files. It uses the FileResolver to convert filename references to actual data URLs.

## How It Works

### Before (Broken)
```typescript
// Element with filename reference
const element = { type: 'image', src: 'photo.jpg' }

// ElementPreview tried to load 'photo.jpg' directly
<img src="photo.jpg" /> // ❌ Broken - file doesn't exist at this path
```

### After (Working)
```typescript
// Element with filename reference  
const element = { type: 'image', src: 'photo.jpg' }

// ElementPreview uses FileResolver to get actual data URL
const resolvedSrc = fileResolver.resolve('photo.jpg') 
// Returns: 'data:image/jpeg;base64,/9j/4AAQ...'

<img src="data:image/jpeg;base64,/9j/4AAQ..." /> // ✅ Works!
```

## Updated Components

### ElementPreview.tsx
- Added `fileResolver?: FileResolver` prop
- Resolves file references before setting preview URL
- Includes error handling for failed loads
- Fallback to icon when resolution fails

### LeftPanel.tsx  
- Creates FileResolver from local files using `createFileResolver(localFiles)`
- Passes FileResolver to ElementPreview component
- Updates automatically when files change

## Features

### 1. Automatic File Resolution
- Converts filenames to data URLs transparently
- Works with both exact and case-insensitive matching
- Handles data URLs and external URLs as-is

### 2. Error Handling
- Shows fallback icon if image/video fails to load
- Graceful degradation for unresolved references
- No broken image placeholders

### 3. Performance Optimized
- Uses React.useMemo to cache FileResolver
- Only recreates resolver when files change
- Efficient re-rendering

### 4. Video Previews
- Shows video thumbnail on hover
- Plays preview on mouse enter
- Pauses and resets on mouse leave
- Muted playback to avoid audio issues

## Usage Example

```typescript
// In any component that shows element previews
import ElementPreview from './ElementPreview';
import { createFileResolver } from '../utils/fileResolver';

function MyComponent({ elements, files }) {
  const fileResolver = React.useMemo(() => 
    createFileResolver(files), [files]
  );

  return (
    <div>
      {elements.map(element => (
        <ElementPreview 
          key={element.id}
          element={element}
          fileResolver={fileResolver}
          className="w-16 h-16"
        />
      ))}
    </div>
  );
}
```

## Benefits

- ✅ **Correct Previews**: Elements show actual image/video content
- ✅ **Local Files**: Works with locally stored files (no server needed)
- ✅ **Automatic**: No manual configuration required
- ✅ **Responsive**: Updates when files are added/removed
- ✅ **Fallback**: Shows appropriate icons when content can't load
- ✅ **Performance**: Efficient caching and minimal re-renders

## Example Workflow

1. **Upload File**: User uploads "landscape.jpg" → stored as base64 in project files
2. **Add Element**: User clicks "+" to add file to page → element created with `src: "landscape.jpg"`
3. **View Elements**: In Elements tab, ElementPreview shows the actual image thumbnail
4. **Resolution**: FileResolver converts "landscape.jpg" → data URL → displays correctly

The left panel Elements tab now shows proper thumbnails for all image and video elements!