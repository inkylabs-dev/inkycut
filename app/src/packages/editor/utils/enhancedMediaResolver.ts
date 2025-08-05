import { LocalFile } from '../../composition/types';
import { MediaResolver } from './mediaResolver';
import { ServiceWorkerResolver } from './serviceWorkerResolver';

/**
 * Enhanced Media Resolver that uses Service Worker for better performance
 * Combines the existing MediaResolver functionality with ServiceWorkerResolver
 */
export class EnhancedMediaResolver extends MediaResolver {
  private serviceWorkerResolver: ServiceWorkerResolver;

  constructor(files: LocalFile[]) {
    super(files);
    this.serviceWorkerResolver = new ServiceWorkerResolver(files);
  }

  /**
   * Update files in both resolvers
   */
  updateFiles(files: LocalFile[]) {
    super.updateFiles(files);
    this.serviceWorkerResolver.updateFiles(files);
  }

  /**
   * Resolve a media source using service worker when possible, fallback to dataUrl
   * @param src Media source (LocalFile:filename, URL, or data URL)
   * @returns The best available URL for the source
   */
  resolveSource(src: string): string {
    if (!src) return '';

    // For LocalFile sources, try service worker first
    if (src.startsWith('LocalFile:')) {
      const fileName = src.replace('LocalFile:', '');
      
      // Check if service worker is available and file exists
      if (this.serviceWorkerResolver.isServiceWorkerAvailable() && 
          this.serviceWorkerResolver.hasFile(fileName)) {
        const swUrl = this.serviceWorkerResolver.generateUrl(fileName);
        if (swUrl) {
          console.log(`Using service worker URL for ${fileName}:`, swUrl);
          return swUrl;
        }
      }
      
      // Fallback to parent resolver (dataUrl)
      console.log(`Falling back to dataUrl for ${fileName} (SW not available or file not found)`);
      return super.resolveSource(src);
    }

    // For non-LocalFile sources, check if we can resolve through service worker
    const file = this.serviceWorkerResolver.getFile(src);
    if (file && this.serviceWorkerResolver.isServiceWorkerAvailable()) {
      const swUrl = this.serviceWorkerResolver.generateUrl(src);
      if (swUrl) {
        console.log(`Using service worker URL for ${src}:`, swUrl);
        return swUrl;
      }
    }

    // Use parent resolver for everything else
    return super.resolveSource(src);
  }

  /**
   * Get audio blob with service worker optimization
   * If service worker is available, we can fetch through it for consistency
   */
  async getAudioBlob(src: string): Promise<Blob | null> {
    if (!src) return null;

    try {
      // For LocalFile sources, try service worker URL first
      if (src.startsWith('LocalFile:')) {
        const fileName = src.replace('LocalFile:', '');
        
        if (this.serviceWorkerResolver.isServiceWorkerAvailable() && 
            this.serviceWorkerResolver.hasFile(fileName)) {
          const swUrl = this.serviceWorkerResolver.generateUrl(fileName);
          if (swUrl) {
            console.log(`Fetching audio blob via service worker for ${fileName}`);
            const response = await fetch(swUrl);
            return await response.blob();
          }
        }
      }

      // Fallback to parent implementation
      return super.getAudioBlob(src);
      
    } catch (error) {
      console.warn(`Enhanced resolver failed for ${src}, falling back to parent:`, error);
      return super.getAudioBlob(src);
    }
  }

  /**
   * Get service worker status information
   */
  getServiceWorkerInfo() {
    return {
      available: this.serviceWorkerResolver.isServiceWorkerAvailable(),
      fileCount: this.serviceWorkerResolver.getAvailableFiles().length,
      controllerActive: navigator.serviceWorker?.controller != null
    };
  }

  /**
   * Force refresh service worker resolver (useful after file updates)
   */
  refreshServiceWorker(files: LocalFile[]) {
    this.serviceWorkerResolver.updateFiles(files);
  }
}

/**
 * Create an Enhanced Media Resolver
 */
export function createEnhancedMediaResolver(files: LocalFile[]): EnhancedMediaResolver {
  return new EnhancedMediaResolver(files);
}

/**
 * Utility function to determine if enhanced resolver should be used
 */
export function shouldUseEnhancedResolver(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Factory function that returns the best resolver for the current environment
 */
export function createOptimalMediaResolver(files: LocalFile[]): MediaResolver | EnhancedMediaResolver {
  if (shouldUseEnhancedResolver()) {
    console.log('Using Enhanced Media Resolver with Service Worker support');
    return new EnhancedMediaResolver(files);
  } else {
    console.log('Using standard Media Resolver (Service Worker not supported)');
    return new MediaResolver(files);
  }
}