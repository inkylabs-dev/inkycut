/**
 * Media utilities for handling images, videos, audio, and aspect ratios
 */

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface AudioMetadata {
  duration: number; // in milliseconds
  sampleRate: number; // in Hz
  channels: number; // number of audio channels
}

/**
 * Get image dimensions from data URL
 * @param dataUrl The data URL of the image
 * @returns Promise that resolves to dimensions or null if failed
 */
export function getImageDimensions(dataUrl: string): Promise<MediaDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = dataUrl;
  });
}

/**
 * Get video dimensions from data URL
 * @param dataUrl The data URL of the video
 * @returns Promise that resolves to dimensions or null if failed
 */
export function getVideoDimensions(dataUrl: string): Promise<MediaDimensions | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      resolve(null);
    };
    video.src = dataUrl;
  });
}

/**
 * Get video duration from data URL
 * @param dataUrl The data URL of the video
 * @returns Promise that resolves to duration in milliseconds or null if failed
 */
export function getVideoDuration(dataUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      const durationMs = Math.round(video.duration * 1000);
      resolve(durationMs);
    };
    video.onerror = () => {
      resolve(null);
    };
    video.src = dataUrl;
  });
}

/**
 * Get audio duration from data URL
 * @param dataUrl The data URL of the audio
 * @returns Promise that resolves to duration in milliseconds or null if failed
 */
export function getAudioDuration(dataUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.onloadedmetadata = () => {
      const durationMs = Math.round(audio.duration * 1000);
      resolve(durationMs);
    };
    audio.onerror = () => {
      resolve(null);
    };
    audio.src = dataUrl;
  });
}

/**
 * Get audio metadata from data URL using Web Audio API
 * @param dataUrl The data URL of the audio
 * @returns Promise that resolves to audio metadata or null if failed
 */
export async function getAudioMetadata(dataUrl: string): Promise<AudioMetadata | null> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration * 1000);
      // Note: Web Audio API would be needed for sampleRate and channels
      // For now, we'll use fallback values and duration from the audio element
      resolve({
        duration,
        sampleRate: 44100, // Common default sample rate
        channels: 2, // Stereo default
      });
    };
    audio.onerror = () => {
      resolve(null);
    };
    audio.src = dataUrl;
  });
}

/**
 * Calculate element dimensions respecting aspect ratio
 * Fits content within a maximum size while maintaining aspect ratio
 * @param originalWidth Original width of the media
 * @param originalHeight Original height of the media
 * @param maxWidth Maximum allowed width (default: 600)
 * @param maxHeight Maximum allowed height (default: 400)
 * @returns Calculated dimensions that fit within constraints
 */
export function calculateElementDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 600,
  maxHeight: number = 400
): MediaDimensions {
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;
  
  // Scale down if too large
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Get dimensions for media file based on its type
 * @param dataUrl The data URL of the media file
 * @param mimeType The MIME type of the file
 * @returns Promise that resolves to dimensions or null if failed
 */
export async function getMediaDimensions(dataUrl: string, mimeType: string): Promise<MediaDimensions | null> {
  if (mimeType.startsWith('image/')) {
    return getImageDimensions(dataUrl);
  } else if (mimeType.startsWith('video/')) {
    return getVideoDimensions(dataUrl);
  } else if (mimeType.startsWith('audio/')) {
    // Audio files don't have visual dimensions, return default audio element size
    return DEFAULT_DIMENSIONS.audio;
  }
  return null;
}

/**
 * Default dimensions for different media types
 */
export const DEFAULT_DIMENSIONS = {
  image: { width: 400, height: 300 },
  video: { width: 640, height: 360 },
  text: { width: 300, height: 100 },
  audio: { width: 300, height: 60 }, // Audio waveform visualization size
} as const;