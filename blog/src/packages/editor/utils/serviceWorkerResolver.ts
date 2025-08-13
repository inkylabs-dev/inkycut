import type { LocalFile } from '../../composition/types';

/**
 * Service Worker URL Generator
 * Creates URLs that can be intercepted by the service worker to serve LocalFiles
 * This replaces direct dataUrl usage to improve performance
 */
export class ServiceWorkerResolver {
  private baseUrl: string;
  private files: Map<string, LocalFile>;

  constructor(files: LocalFile[] = []) {
    this.baseUrl = window.location.origin;
    this.files = new Map();
    this.updateFiles(files);
  }

  /**
   * Update the internal file mapping
   */
  updateFiles(files: LocalFile[]) {
    this.files.clear();
    files.forEach(file => {
      // Index by both ID and name for flexible lookups
      this.files.set(file.id, file);
      this.files.set(file.name.toLowerCase(), file);
    });
  }

  /**
   * Generate a service worker compatible URL for a LocalFile
   * @param identifier File ID, filename, or LocalFile: prefixed string
   * @returns URL that the service worker can intercept
   */
  generateUrl(identifier: string): string {
    if (!identifier) return '';

    // Clean the identifier
    const cleanId = identifier.replace(/^LocalFile:/, '');
    
    // Check if file exists in our mapping
    const file = this.files.get(cleanId) || this.files.get(cleanId.toLowerCase());
    if (!file) {
      console.warn(`ServiceWorkerResolver: File not found: ${cleanId}`);
      return '';
    }

    // Generate a service worker interceptable URL
    // Format: /sw-files/{fileId}/{filename}
    const encodedFilename = encodeURIComponent(file.name);
    return `${this.baseUrl}/sw-files/${file.id}/${encodedFilename}`;
  }

  /**
   * Generate URL with query parameter (alternative format)
   * @param identifier File ID or filename
   * @returns URL with file parameter
   */
  generateQueryUrl(identifier: string): string {
    if (!identifier) return '';

    const cleanId = identifier.replace(/^LocalFile:/, '');
    const file = this.files.get(cleanId) || this.files.get(cleanId.toLowerCase());
    if (!file) {
      return '';
    }

    return `${this.baseUrl}/sw-file?file=${encodeURIComponent(file.name)}&id=${file.id}`;
  }

  /**
   * Check if service worker is available and registered
   */
  isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller != null;
  }

  /**
   * Resolve a source to either service worker URL or fallback to dataUrl
   * @param src Source identifier
   * @returns Best available URL for the source
   */
  resolve(src: string): string {
    if (!src) return '';

    // If it's already a resolved URL, return as-is
    if (src.startsWith('http') || src.startsWith('https') || src.startsWith('blob:')) {
      return src;
    }

    // If it's already a data URL, check if we can provide a better alternative
    if (src.startsWith('data:')) {
      return src; // Keep data URLs as fallback
    }

    const cleanId = src.replace(/^LocalFile:/, '');
    const file = this.files.get(cleanId) || this.files.get(cleanId.toLowerCase());
    
    if (!file) {
      console.warn(`ServiceWorkerResolver: File not found for resolution: ${cleanId}`);
      return src; // Return original if we can't resolve
    }

    // If service worker is available, use service worker URL
    if (this.isServiceWorkerAvailable()) {
      return this.generateUrl(cleanId);
    }

    // Fallback to data URL
    return file.dataUrl || '';
  }

  /**
   * Get file information by identifier
   */
  getFile(identifier: string): LocalFile | undefined {
    const cleanId = identifier.replace(/^LocalFile:/, '');
    return this.files.get(cleanId) || this.files.get(cleanId.toLowerCase());
  }

  /**
   * Check if a file exists in the resolver
   */
  hasFile(identifier: string): boolean {
    const cleanId = identifier.replace(/^LocalFile:/, '');
    return this.files.has(cleanId) || this.files.has(cleanId.toLowerCase());
  }

  /**
   * Get all available files
   */
  getAvailableFiles(): string[] {
    const uniqueFiles = new Set<string>();
    this.files.forEach(file => {
      uniqueFiles.add(file.name);
    });
    return Array.from(uniqueFiles);
  }
}

/**
 * Create a ServiceWorkerResolver instance
 */
export function createServiceWorkerResolver(files: LocalFile[] = []): ServiceWorkerResolver {
  return new ServiceWorkerResolver(files);
}

/**
 * Global service worker resolver instance
 * Can be used across the application for consistent file URL generation
 */
let globalResolver: ServiceWorkerResolver | null = null;

export function getGlobalServiceWorkerResolver(): ServiceWorkerResolver {
  if (!globalResolver) {
    globalResolver = new ServiceWorkerResolver();
  }
  return globalResolver;
}

export function updateGlobalServiceWorkerResolver(files: LocalFile[]) {
  const resolver = getGlobalServiceWorkerResolver();
  resolver.updateFiles(files);
}

/**
 * Utility function to resolve any source through service worker if possible
 */
export function resolveWithServiceWorker(src: string, files?: LocalFile[]): string {
  if (files) {
    const resolver = createServiceWorkerResolver(files);
    return resolver.resolve(src);
  }
  
  return getGlobalServiceWorkerResolver().resolve(src);
}