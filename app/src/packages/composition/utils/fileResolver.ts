import { LocalFile } from '../types';

/**
 * Resolves file references in element sources to service worker URLs or data URLs
 * Maps filenames like "1.png" to service worker interceptable URLs when possible
 */
export class FileResolver {
  private fileMap: Map<string, string> = new Map();
  private files: LocalFile[] = [];

  constructor(files: LocalFile[]) {
    this.updateFiles(files);
  }

  /**
   * Update the internal file mapping
   * @param files Array of local files with data URLs
   */
  updateFiles(files: LocalFile[]) {
    this.files = files;
    this.fileMap.clear();
    files.forEach(file => {
      // Generate service worker URL if available, otherwise use dataUrl
      const resolvedUrl = this.generateFileUrl(file);
      
      // Map by exact filename
      this.fileMap.set(file.name, resolvedUrl);
      
      // Also map by file ID for programmatic references
      this.fileMap.set(file.id, resolvedUrl);
    });
  }

  /**
   * Generate the best URL for a file (service worker URL or dataUrl fallback)
   */
  private generateFileUrl(file: LocalFile): string {
    // Check if service worker is available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Generate service worker interceptable URL
      const baseUrl = window.location.origin;
      // Use both ID and filename for robust lookup
      return `${baseUrl}/sw-files/${file.id}/${encodeURIComponent(file.name)}`;
    }
    
    // Fallback to dataUrl
    return file.dataUrl;
  }

  /**
   * Resolve a file reference to its URL (service worker URL or data URL)
   * @param src File reference (filename, file ID, or already a URL)
   * @returns The resolved URL or the original src if not found/already resolved
   */
  resolve(src: string): string {
    if (!src) return '';
    
    // If it's already a data URL, return as-is
    if (src.startsWith('data:')) {
      return src;
    }
    
    // If it's a full URL (http/https), return as-is
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    
    // Try to resolve from our file mapping
    const resolved = this.fileMap.get(src);
    if (resolved) {
      return resolved;
    }
    
    // If no exact match, try case-insensitive filename matching
    const lowerSrc = src.toLowerCase();
    for (const [filename, dataUrl] of this.fileMap.entries()) {
      if (filename.toLowerCase() === lowerSrc) {
        return dataUrl;
      }
    }
    
    // Return original src as fallback (might be a placeholder or external URL)
    return src;
  }

  /**
   * Get all available file references
   * @returns Array of available file names and IDs
   */
  getAvailableFiles(): string[] {
    return Array.from(this.fileMap.keys());
  }

  /**
   * Check if a file reference can be resolved
   * @param src File reference to check
   * @returns True if the reference can be resolved
   */
  canResolve(src: string): boolean {
    if (!src) return false;
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      return true;
    }
    return this.fileMap.has(src) || this.fileMap.has(src.toLowerCase());
  }
}

/**
 * Create a FileResolver from project files
 * @param files Array of local files
 * @returns Configured FileResolver instance
 */
export function createFileResolver(files: LocalFile[]): FileResolver {
  return new FileResolver(files);
}
