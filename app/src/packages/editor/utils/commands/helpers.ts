/**
 * Shared helper functions for slash commands
 */

import { generateKey, exportKey, encryptData, generateShareableKey } from '../encryptionUtils';

/**
 * Helper function to perform JSON export directly
 */
export async function performJSONExport(project: any, fileStorage: any): Promise<void> {
  if (!project) {
    throw new Error('No project to export');
  }

  try {
    // Get files from current storage to include in export
    const filesFromStorage = await fileStorage.getAllFiles();
    
    // Ensure the project has all required fields before export
    const completeProject = {
      ...project,
      // Ensure required fields are present
      id: project.id || `project-${Date.now()}`,
      name: project.name || 'Untitled Project',
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString(),
      propertiesEnabled: project.propertiesEnabled ?? true,
      // Ensure composition has all required fields
      composition: project.composition ? {
        pages: project.composition.pages || [],
        fps: project.composition.fps || 30,
        width: project.composition.width || 1920,
        height: project.composition.height || 1080,
        audios: project.composition.audios || []
      } : {
        pages: [],
        fps: 30,
        width: 1920,
        height: 1080,
        audios: []
      },
      // Ensure appState exists
      appState: project.appState || {
        selectedElementId: null,
        selectedPageId: null,
        viewMode: 'edit' as const,
        zoomLevel: 1,
        showGrid: false,
        isLoading: false,
        error: null,
        history: { past: [], future: [] }
      },
      // Include files from IndexedDB in the exported JSON
      files: filesFromStorage,
      // Preserve metadata
      metadata: project.metadata || {}
    };

    // Create JSON blob
    const jsonData = JSON.stringify(completeProject, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${completeProject.name}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export project');
  }
}

/**
 * Helper function to parse human-readable duration strings
 * Supports: ms (default), s (seconds), m (minutes)
 * Examples: "1000", "1.5s", "2m", "500ms"
 */
export function parseDuration(durationStr: string): number | null {
  const trimmed = durationStr.trim();
  
  // If it's just a number, treat as milliseconds
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const ms = parseFloat(trimmed);
    return ms > 0 ? ms : null;
  }
  
  // Parse with unit suffix
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/i);
  if (!match) {
    return null;
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (value <= 0) {
    return null;
  }
  
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Helper function to perform direct sharing
 */
export async function performDirectShare(project: any, onShare: any): Promise<string> {
  if (!project) {
    throw new Error('No project to share');
  }

  if (!onShare) {
    throw new Error('Share functionality not available');
  }

  try {
    // Generate encryption key
    const key = await generateKey();
    const keyBase64 = await exportKey(key);
    const shareableKey = generateShareableKey(keyBase64);

    // Prepare project data for sharing (include files in encrypted data)
    const projectToShare = {
      ...project,
      // Include files in encrypted data for full project sharing
      files: project.files || [],
      appState: {
        selectedElementId: null,
        selectedPageId: project.composition?.pages?.[0]?.id || null,
        viewMode: 'view' as const,
        zoomLevel: 1,
        showGrid: false,
        isLoading: false,
        error: null,
        history: { past: [], future: [] }
      }
    };

    // Encrypt the project data
    const projectJson = JSON.stringify(projectToShare);
    const { encrypted, iv } = await encryptData(projectJson, key);

    // Combine encrypted data and IV
    const encryptedPayload = JSON.stringify({ encrypted, iv });

    // Call backend API to upload to S3 and get share ID
    const shareResponse = await onShare({
      encryptedData: encryptedPayload,
      projectName: project.name || 'Untitled Project'
    });

    const { shareId } = shareResponse;

    // Generate and return the shareable link
    const shareableLink = `${window.location.origin}/shared/${shareId}#key=${shareableKey}`;
    return shareableLink;
  } catch (error) {
    console.error('Share failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to share project');
  }
}