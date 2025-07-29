---
title: "IndexedDB File Storage Implementation"
description: "Technical specification for implementing IndexedDB-based file storage in InkyCut video editor"
---

## Overview

This specification describes the behavior and implementation requirements for storing project files in IndexedDB instead of including them directly in the project JSON data structure. The implementation supports both local projects (persistent storage) and shared projects (in-memory storage).

## Background

Previously, project files were stored as base64-encoded data URLs directly within the `Project.files` array. This approach had several limitations:
- Large file sizes caused performance issues
- JSON exports became very large (potentially hundreds of MB)
- Browser memory usage was excessive
- Serialization/deserialization was slow

## Project Types

### Local Projects
- User-created projects that persist across browser sessions
- Files stored in IndexedDB for persistence
- Can be edited, saved, and restored

### Shared Projects
- Projects loaded from remote JSON URLs (read-only)
- Files stored in memory only (no IndexedDB persistence)
- Should not modify user's local IndexedDB data
- Temporary viewing/fork-and-edit functionality

## Requirements

### 1. File Storage Location

**Requirement**: Project files MUST be stored appropriately based on project type.

**Implementation**: 
- **Local Projects**: Files stored in IndexedDB database `InkyCutFiles`
- **Shared Projects**: Files stored in memory using Map-based storage
- Database uses object store named `files` with keyPath `id`
- Files contain: `id`, `name`, `type`, `size`, `dataUrl`, `createdAt`, `width`, `height`, `duration`

### 2. Project Data Structure

**Requirement**: The `Project.files` array MUST remain empty in localStorage and exported JSON, but MUST be populated with files when exporting to JSON.

**Implementation**:
- `Project.files` in localStorage: `[]` (always empty)
- `Project.files` in exported JSON: populated from storage (IndexedDB or memory)
- Runtime access to files: through storage abstraction via `filesAtom`

### 3. Storage Mode Detection

**Requirement**: The system MUST automatically detect whether to use IndexedDB or in-memory storage.

**Implementation**:
- Check if project is a shared/remote project
- Use in-memory storage for shared projects
- Use IndexedDB for local projects
- Provide API to explicitly set storage mode

### 4. File Upload Behavior

**Requirement**: When a user uploads a local file, it MUST be stored using the appropriate storage method.

**Implementation**:
- File converted to base64 data URL
- Metadata extracted: dimensions (width/height) for images/videos, duration for videos
- Stored using current storage mode (IndexedDB or memory)
- `Project.files` remains empty
- UI updated via `filesAtom` refresh

### 5. JSON Import Behavior (Local Projects)

**Requirement**: When importing a JSON project file that contains files, those files MUST be extracted and stored in IndexedDB.

**Implementation**:
- Parse JSON and extract `files` array
- Clear existing files in IndexedDB
- Store imported files using `fileStorage.storeFiles()`
- Remove `files` from project data before storing in localStorage
- Set `Project.files = []` in the imported project

### 6. Shared Project Loading

**Requirement**: When loading a shared project, files MUST be stored in memory and NOT affect IndexedDB.

**Implementation**:
- Parse remote JSON and extract `files` array
- Store files in memory-only storage
- Do not clear or modify IndexedDB
- Allow fork-and-edit to migrate to IndexedDB storage

### 7. JSON Export Behavior

**Requirement**: When exporting a project to JSON, the exported file MUST include all files from current storage.

**Implementation**:
- Retrieve all files from current storage (IndexedDB or memory)
- Include files in the exported JSON structure
- Export contains complete project with files for portability

### 8. Clear Project Behavior

**Requirement**: When clearing/resetting a project, behavior MUST depend on project type.

**Implementation**:
- **Local Projects**: Clear IndexedDB files and reset project
- **Shared Projects**: Clear memory storage only, preserve IndexedDB
- Reset `filesAtom` to empty array

### 9. Fork and Edit Behavior

**Requirement**: When forking a shared project, files MUST be migrated to IndexedDB storage.

**Implementation**:
- Copy all files from memory storage to IndexedDB
- Switch storage mode to IndexedDB
- Convert project to local project type
- Preserve all file data and references

### 10. File Access During Runtime

**Requirement**: Components MUST access files through the `filesAtom` which loads from current storage.

**Implementation**:
- `filesAtom` is async and loads from current storage
- Storage abstraction handles IndexedDB vs memory transparently
- Components use `useAtom(filesAtom)` for file access
- File operations update current storage and refresh `filesAtom`

### 11. Error Handling

**Requirement**: File operations MUST handle storage errors gracefully.

**Implementation**:
- Wrap storage operations in try-catch blocks
- Log errors to console
- Provide user-friendly error messages
- Fallback to memory storage if IndexedDB fails

### 12. Storage Mode Switching

**Requirement**: System MUST support switching between storage modes.

**Implementation**:
- Provide API to switch from memory to IndexedDB (fork scenario)
- Migrate files during mode switch
- Clear old storage when appropriate
- Update atoms to reflect new storage mode

## API Surface

### FileStorage Interface

```typescript
interface IFileStorage {
  // Storage mode
  readonly mode: 'indexeddb' | 'memory';
  
  // Initialize storage
  init(): Promise<void>;
  
  // File operations
  storeFile(file: LocalFile): Promise<void>;
  getFile(id: string): Promise<LocalFile | null>;
  getAllFiles(): Promise<LocalFile[]>;
  deleteFile(id: string): Promise<void>;
  clearAllFiles(): Promise<void>;
  storeFiles(files: LocalFile[]): Promise<void>;
  
  // Storage info
  getStorageStats(): Promise<{
    fileCount: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }>;
  
  // Mode switching
  migrateToIndexedDB?(): Promise<void>;
}
```

### FileStorage Factory

```typescript
// Create storage instance based on mode
function createFileStorage(mode: 'indexeddb' | 'memory'): IFileStorage

// Get current storage mode for project
function getStorageModeForProject(project: Project): 'indexeddb' | 'memory'

// Switch storage mode and migrate files
async function switchStorageMode(
  from: IFileStorage, 
  to: IFileStorage
): Promise<void>
```

### Updated Jotai Atoms

```typescript
// Current storage mode
storageModeAtom: Atom<'indexeddb' | 'memory'>

// Current file storage instance
fileStorageAtom: Atom<IFileStorage>

// Load files from current storage (async)
filesAtom: Atom<Promise<LocalFile[]>>

// Storage-aware file operations
addFileAtom: WriteAtom<File>
removeFileAtom: WriteAtom<string>
clearAllFilesAtom: WriteAtom<void>
importFilesAtom: WriteAtom<LocalFile[]>

// Fork shared project to local
forkProjectAtom: WriteAtom<void>
```

## Data Flow

### Local Project File Upload Flow
1. User selects file via `LocalFileUpload` component
2. System detects local project → use IndexedDB storage
3. File converted to `LocalFile` object with data URL and metadata (width, height, duration)
4. `addFileAtom` stores file in IndexedDB
5. `filesAtom` refreshed to show new file in UI

### Shared Project Loading Flow
1. Load remote JSON via `SharedProjectPage`
2. Parse JSON and extract project data and files
3. Create memory-based file storage
4. Store files in memory using `importFilesAtom`
5. Set project data without files (`files: []`)
6. UI shows files from memory storage

### Fork Shared Project Flow
1. User clicks "Fork and Edit" on shared project
2. `forkProjectAtom` triggered
3. Create IndexedDB storage instance
4. Migrate all files from memory to IndexedDB
5. Switch storage mode to IndexedDB
6. Convert to local project
7. Update all UI state

### JSON Export Flow (Any Project Type)
1. User clicks export in `ExportDialog`
2. Get current project from `projectAtom`
3. Get current storage from `fileStorageAtom`
4. Get all files from current storage
5. Merge files into project structure
6. Export complete project JSON with files

## Storage Implementations

### IndexedDBStorage
- Persistent storage using browser IndexedDB
- Database: `InkyCutFiles`, Store: `files`
- Survives browser sessions and page reloads
- Used for local projects

### MemoryStorage
- Temporary storage using JavaScript Map
- Cleared on page reload or navigation
- No persistence across sessions
- Used for shared/remote projects

## Migration Strategy

### Existing Local Projects
Projects with files in `Project.files` should be migrated automatically:
1. Detect files in `Project.files` on project load
2. Move files to IndexedDB using `importFilesAtom`
3. Clear `Project.files` array
4. Update project in localStorage

### Shared Project Access
For shared projects loaded from remote URLs:
1. Parse remote JSON and extract files
2. Create memory storage for session
3. Store files in memory only
4. Provide fork option to convert to local project

## Browser Compatibility

- **IndexedDB**: Check `typeof indexedDB !== 'undefined'`
- **Fallback**: Use memory storage if IndexedDB unavailable
- **Progressive Enhancement**: Core functionality works without persistence

## Performance Considerations

- Use async/await for all storage operations
- Lazy load files only when needed
- Batch operations for multiple files
- Provide progress feedback for large operations
- Memory cleanup for shared projects

## Security Considerations

- Validate file types and sizes before storage
- Sanitize file data to prevent XSS
- Respect browser storage quotas
- Clear sensitive data on logout (if authentication added)

## Testing Strategy

- Test both storage modes independently
- Test migration between storage modes
- Test shared project loading without IndexedDB interference
- Test fork-and-edit functionality
- Test error scenarios and fallbacks
- Performance testing with large files
- Browser compatibility testing

This implementation provides a robust, flexible file storage system that handles both local project persistence and shared project viewing while maintaining clean separation of concerns.
