# File Resolution System

## Overview
The file resolution system allows the player to replace file references like `1.png` with actual base64 data URLs from locally stored files.

## How It Works

### 1. File Storage
- Files are stored locally in the project's `files` array as `LocalFile` objects
- Each file contains the original filename and a base64 data URL
- No files are sent to the server - everything stays local

### 2. File Resolution
- The `FileResolver` class maps filenames to their data URLs
- When rendering elements, file references are automatically resolved
- Supports exact filename matching and case-insensitive fallback

### 3. Usage Flow

#### Adding Files to Project
1. User uploads files via the "Add Local Files" interface
2. Files are converted to base64 data URLs and stored in project.files
3. Files appear in the "Project Files" list

#### Using Files in Elements
1. Click the "+" button next to any file to add it to the current page
2. The element's `src` property is set to the filename (e.g., "image.png")
3. During rendering, the FileResolver converts "image.png" to the actual data URL

#### File Reference Resolution
```typescript
// Element with file reference
const element = {
  type: 'image',
  src: 'my-photo.jpg',  // Filename reference
  // ... other properties
}

// FileResolver converts to actual data URL
fileResolver.resolve('my-photo.jpg') // Returns: data:image/jpeg;base64,/9j/4AAQ...
```

## File Resolution Priority

1. **Already resolved**: If `src` starts with `data:`, return as-is
2. **External URL**: If `src` starts with `http://` or `https://`, return as-is  
3. **Exact filename match**: Look for exact filename in local files
4. **Case-insensitive match**: Try lowercase comparison
5. **Fallback**: Return original `src` if not found

## Components Updated

### 1. `FileResolver` (`utils/fileResolver.ts`)
- Core resolution logic
- Maps filenames to data URLs
- Handles multiple reference types
- Minimal logging for better performance

### 2. `Composition.tsx`
- `ElementRenderer` accepts `fileResolver` prop
- Image/video elements use resolved sources
- Maintains backward compatibility

### 3. `MiddlePanel.tsx`
- Passes local files to the player
- Creates FileResolver from project files

### 4. `FileListItem.tsx` (NEW)
- Dedicated component for file list items
- Handles add-to-page functionality
- Automatic aspect ratio detection
- Smart dimension calculation

### 5. `mediaUtils.ts` (NEW)
- Image/video dimension detection utilities
- Aspect ratio calculation functions
- Default dimensions for different media types
- Clean separation of media processing logic

### 6. `LeftPanel.tsx`
- Simplified file list rendering
- Uses FileListItem component
- Cleaner code organization

## Example Usage

```typescript
// 1. User uploads "landscape.jpg" 
// 2. File is stored with filename "landscape.jpg" and data URL
// 3. User adds image element with src: "landscape.jpg"
// 4. During rendering:
const element = { type: 'image', src: 'landscape.jpg' }
const resolvedSrc = fileResolver.resolve('landscape.jpg')
// resolvedSrc = "data:image/jpeg;base64,/9j/4AAQSk..."
```

## Benefits

- ✅ **Local-first**: No server dependencies for file handling
- ✅ **Simple references**: Use readable filenames instead of data URLs in JSON
- ✅ **Automatic resolution**: Transparent conversion during rendering
- ✅ **Multiple formats**: Supports images, videos, and future file types
- ✅ **Aspect ratio aware**: Automatically respects original image/video proportions
- ✅ **Clean architecture**: Well-organized components with single responsibilities
- ✅ **Performance optimized**: Minimal logging and efficient processing
- ✅ **User-friendly**: Easy "+" button workflow for adding files to pages