/**
 * Shared helper functions for slash commands
 */

import { generateKey, exportKey, encryptData, generateShareableKey } from '../encryptionUtils';
import type { CompositionElement, CompositionPage } from '../../types';

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
      // Include notes array
      notes: project.notes || [],
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
    return ms >= 0 ? ms : null;
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
      // Include notes for sharing
      notes: project.notes || [],
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

/**
 * Find an element by ID across all pages in the project
 */
export function findElementById(project: any, elementId: string): CompositionElement | null {
  if (!project?.composition?.pages) {
    return null;
  }

  for (const page of project.composition.pages) {
    const element = page.elements?.find((el: CompositionElement) => el.id === elementId);
    if (element) {
      return element;
    }
  }

  return null;
}

/**
 * Find a page by ID in the project
 */
export function findPageById(project: any, pageId: string): CompositionPage | null {
  if (!project?.composition?.pages) {
    return null;
  }

  return project.composition.pages.find((page: CompositionPage) => page.id === pageId) || null;
}

/**
 * Copy all compatible properties from source element to target element data
 * Preserves all properties from CompositionElement interface including animations
 */
export function copyElementProperties(sourceElement: CompositionElement, targetElementData: any, targetType: string): void {
  // Common properties that apply to all element types
  const commonProperties = [
    'left', 'top', 'width', 'height', 'rotation', 'opacity', 'zIndex', 'delay'
  ];

  // Copy common properties
  commonProperties.forEach(prop => {
    if (sourceElement[prop as keyof CompositionElement] !== undefined) {
      targetElementData[prop] = sourceElement[prop as keyof CompositionElement];
    }
  });

  // Copy animation properties if present
  if (sourceElement.animation) {
    targetElementData.animation = {
      ...sourceElement.animation,
      // Deep copy props object if it exists
      props: sourceElement.animation.props ? { ...sourceElement.animation.props } : undefined
    };
  }

  // Copy type-specific properties based on target type
  if (targetType === 'text') {
    // Copy text-specific properties
    if (sourceElement.text !== undefined) targetElementData.text = sourceElement.text;
    if (sourceElement.fontSize !== undefined) targetElementData.fontSize = sourceElement.fontSize;
    if (sourceElement.fontFamily !== undefined) targetElementData.fontFamily = sourceElement.fontFamily;
    if (sourceElement.color !== undefined) targetElementData.color = sourceElement.color;
    if (sourceElement.fontWeight !== undefined) targetElementData.fontWeight = sourceElement.fontWeight;
    if (sourceElement.textAlign !== undefined) targetElementData.textAlign = sourceElement.textAlign;
  } else if (targetType === 'video') {
    // Copy video-specific properties
    if (sourceElement.src !== undefined) targetElementData.src = sourceElement.src;
  } else if (targetType === 'image') {
    // Copy image-specific properties
    if (sourceElement.src !== undefined) targetElementData.src = sourceElement.src;
  }

  // Always ensure the correct type for the target element
  targetElementData.type = targetType;
}

/**
 * Copy all properties from source page to target page data
 * Preserves all properties from CompositionPage interface including backgroundColor
 */
export function copyPageProperties(sourcePage: CompositionPage, targetPageData: any): void {
  // Copy all page properties except id and elements (handled separately)
  if (sourcePage.name !== undefined) targetPageData.name = sourcePage.name;
  if (sourcePage.duration !== undefined) targetPageData.duration = sourcePage.duration;
  if (sourcePage.backgroundColor !== undefined) targetPageData.backgroundColor = sourcePage.backgroundColor;
  
  // Deep copy elements with new unique IDs
  if (sourcePage.elements) {
    targetPageData.elements = sourcePage.elements.map((element: CompositionElement) => ({
      ...element,
      // Generate new unique ID for the copied element
      id: `${element.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Deep copy animation if present
      animation: element.animation ? {
        ...element.animation,
        props: element.animation.props ? { ...element.animation.props } : undefined
      } : undefined,
      // Deep copy nested elements for groups if present
      elements: element.elements ? element.elements.map((nestedEl: CompositionElement) => ({
        ...nestedEl,
        id: `${nestedEl.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        animation: nestedEl.animation ? {
          ...nestedEl.animation,
          props: nestedEl.animation.props ? { ...nestedEl.animation.props } : undefined
        } : undefined
      })) : undefined
    }));
  }
}

/**
 * Generate a unique element ID with the specified type prefix
 */
export function generateElementId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique page ID
 */
export function generatePageId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate total project duration in milliseconds (sum of all page durations)
 */
export function calculateTotalProjectDuration(project: any): number {
  if (!project?.composition?.pages || project.composition.pages.length === 0) {
    return 0;
  }
  
  return project.composition.pages.reduce((sum: number, page: any) => sum + (page.duration || 0), 0);
}

/**
 * Clamp audio duration to not exceed the total project duration
 * This ensures audio tracks don't extend beyond the project timeline
 */
export function clampAudioDuration(audio: any, maxProjectDurationMs: number): any {
  if (!audio) return audio;
  
  const audioEnd = audio.delay + audio.duration;
  
  // If audio extends beyond project duration, clamp it
  if (audioEnd > maxProjectDurationMs) {
    const clampedDuration = Math.max(0, maxProjectDurationMs - audio.delay);
    return {
      ...audio,
      duration: clampedDuration
    };
  }
  
  return audio;
}

/**
 * Clamp all audios in a composition to not exceed project duration
 */
export function clampCompositionAudios(composition: any): any {
  if (!composition || !composition.audios || composition.audios.length === 0) {
    return composition;
  }
  
  const totalProjectDuration = composition.pages?.reduce((sum: number, page: any) => sum + (page.duration || 0), 0) || 0;
  
  return {
    ...composition,
    audios: composition.audios.map((audio: any) => clampAudioDuration(audio, totalProjectDuration))
  };
}