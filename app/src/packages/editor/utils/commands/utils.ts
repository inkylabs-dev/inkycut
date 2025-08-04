/**
 * Shared utility functions for slash commands
 */

/**
 * Parse time value (supports seconds like "1s" or milliseconds like "1000")
 * @param timeStr - Time string to parse
 * @returns Time value in milliseconds
 * @throws Error if the time string is invalid
 */
export function parseTimeValue(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('Time value must be a non-empty string');
  }

  if (timeStr.endsWith('s')) {
    // Convert seconds to milliseconds
    const seconds = parseFloat(timeStr.slice(0, -1));
    if (isNaN(seconds)) {
      throw new Error('Invalid seconds value');
    }
    return seconds * 1000;
  } else {
    // Assume milliseconds
    const milliseconds = parseInt(timeStr, 10);
    if (isNaN(milliseconds)) {
      throw new Error('Invalid milliseconds value');
    }
    return milliseconds;
  }
}

/**
 * Format time value for display
 * @param timeMs - Time in milliseconds
 * @returns Formatted string like "1000ms (1.0s)"
 */
export function formatTimeValue(timeMs: number): string {
  return `${timeMs}ms (${(timeMs / 1000).toFixed(1)}s)`;
}
