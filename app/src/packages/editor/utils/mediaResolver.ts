import { LocalFile } from '../types';
import { FileResolver, createFileResolver } from './fileResolver';

/**
 * Media resolution utility for handling audio, video, and image sources
 * Resolves LocalFile: prefixed sources and creates proper data URLs/blobs
 */
export class MediaResolver {
  private fileResolver: FileResolver;
  private files: LocalFile[];

  constructor(files: LocalFile[]) {
    this.files = files;
    this.fileResolver = createFileResolver(files);
  }

  /**
   * Update the internal file mapping
   * @param files Array of local files with data URLs and blobs
   */
  updateFiles(files: LocalFile[]) {
    this.files = files;
    this.fileResolver.updateFiles(files);
  }

  /**
   * Resolve a media source to its appropriate URL
   * @param src Media source (LocalFile:filename, URL, or data URL)
   * @returns The resolved URL
   */
  resolveSource(src: string): string {
    if (!src) return '';

    // Handle LocalFile: prefixed sources
    if (src.startsWith('LocalFile:')) {
      const fileName = src.replace('LocalFile:', '');
      const resolvedUrl = this.fileResolver.resolve(fileName);
      return resolvedUrl;
    }

    // For other sources, use fileResolver directly
    return this.fileResolver.resolve(src);
  }

  /**
   * Get a Blob for audio waveform visualization
   * @param src Media source (LocalFile:filename, URL, or data URL)
   * @returns Promise that resolves to a Blob or null
   */
  async getAudioBlob(src: string): Promise<Blob | null> {
    if (!src) return null;

    try {
      // Handle LocalFile: prefixed sources
      if (src.startsWith('LocalFile:')) {
        const fileName = src.replace('LocalFile:', '');
        const localFile = this.files.find(file => file.name === fileName);
        
        if (localFile?.blob) {
          return localFile.blob;
        } else if (localFile?.dataUrl) {
          // Convert data URL to blob
          const response = await fetch(localFile.dataUrl);
          return await response.blob();
        }
        
        console.warn(`Local audio file not found or no blob/dataUrl available: ${fileName}`);
        return null;
      }

      // Handle regular URLs and data URLs
      if (src.startsWith('http') || src.startsWith('https') || src.startsWith('data:') || src.startsWith('blob:')) {
        const response = await fetch(src);
        return await response.blob();
      }

      // Try to resolve through fileResolver first
      const resolvedSrc = this.fileResolver.resolve(src);
      if (resolvedSrc !== src) {
        const response = await fetch(resolvedSrc);
        return await response.blob();
      }

      console.warn(`Unable to resolve audio source: ${src}`);
      return null;
    } catch (error) {
      console.warn(`Failed to load audio blob for: ${src}`, error);
      return null;
    }
  }

  /**
   * Check if a source can be resolved
   * @param src Media source to check
   * @returns True if the source can be resolved
   */
  canResolve(src: string): boolean {
    if (!src) return false;
    
    if (src.startsWith('LocalFile:')) {
      const fileName = src.replace('LocalFile:', '');
      return this.fileResolver.canResolve(fileName);
    }
    
    return this.fileResolver.canResolve(src);
  }

  /**
   * Get all available media files
   * @returns Array of available file names
   */
  getAvailableFiles(): string[] {
    return this.fileResolver.getAvailableFiles();
  }
}

/**
 * Create a MediaResolver from project files
 * @param files Array of local files
 * @returns Configured MediaResolver instance
 */
export function createMediaResolver(files: LocalFile[]): MediaResolver {
  return new MediaResolver(files);
}