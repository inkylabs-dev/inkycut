/**
 * Time conversion utilities for converting between time units and frames
 */

/**
 * Convert milliseconds to frames based on FPS
 */
export function millisecondsToFrames(milliseconds: number, fps: number): number {
  return Math.round((milliseconds / 1000) * fps);
}

/**
 * Convert frames to milliseconds based on FPS
 */
export function framesToMilliseconds(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000);
}

/**
 * Convert seconds to frames based on FPS
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Convert frames to seconds based on FPS
 */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/**
 * Parse human-readable duration strings and convert to frames
 * Supports: ms (milliseconds), s (seconds), m (minutes), f (frames)
 * Examples: "1000ms", "1.5s", "2m", "30f"
 */
export function parseDurationToFrames(durationStr: string, fps: number): number | null {
  const trimmed = durationStr.trim();
  
  // If it's just a number, treat as milliseconds (backward compatibility)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const ms = parseFloat(trimmed);
    return ms >= 0 ? millisecondsToFrames(ms, fps) : null;
  }
  
  // Parse with unit suffix
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|f)$/i);
  if (!match) {
    return null;
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (value < 0) {
    return null;
  }
  
  switch (unit) {
    case 'ms':
      return millisecondsToFrames(value, fps);
    case 's':
      return secondsToFrames(value, fps);
    case 'm':
      return secondsToFrames(value * 60, fps);
    case 'f':
      return Math.round(value);
    default:
      return null;
  }
}

/**
 * Format frames as human-readable duration string
 * Returns the most appropriate unit (frames, seconds, or minutes)
 */
export function formatFramesToDuration(frames: number, fps: number): string {
  if (frames === 0) return '0f';
  
  const seconds = framesToSeconds(frames, fps);
  
  // If it's less than 1 second, show as frames
  if (seconds < 1) {
    return `${frames}f`;
  }
  
  // If it's an exact number of minutes, show as minutes
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  
  // If it's an exact number of seconds, show as seconds
  if (seconds % 1 === 0) {
    return `${seconds}s`;
  }
  
  // Show as decimal seconds
  return `${seconds.toFixed(1)}s`;
}

/**
 * Convert legacy millisecond-based duration to frames
 * Used for migration purposes
 */
export function convertLegacyDurationToFrames(duration: number, fps: number): number {
  // Assume the duration is in milliseconds and convert to frames
  return millisecondsToFrames(duration, fps);
}

/**
 * Validate that a frame value is non-negative and integer
 */
export function validateFrames(frames: number): boolean {
  return Number.isInteger(frames) && frames >= 0;
}