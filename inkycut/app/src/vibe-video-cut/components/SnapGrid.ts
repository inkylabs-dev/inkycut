// Grid snap functionality for interactive elements
export const GRID_SIZE = 8; // 8px grid

/**
 * Snaps a position to the nearest grid point
 * @param position The position to snap
 * @param gridSize The grid size (default: 8px)
 * @returns The snapped position
 */
export const snapToGrid = (position: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(position / gridSize) * gridSize;
};

/**
 * Checks if a position is close enough to snap to another position
 * @param pos1 First position
 * @param pos2 Second position
 * @param threshold The snap threshold (default: 10px)
 * @returns Whether the positions should snap
 */
export const shouldSnap = (pos1: number, pos2: number, threshold: number = 10): boolean => {
  return Math.abs(pos1 - pos2) <= threshold;
};
