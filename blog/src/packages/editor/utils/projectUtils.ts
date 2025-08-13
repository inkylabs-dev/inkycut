import type { Project } from '../../composition/types';

/**
 * Creates a copy of the project data excluding fields that shouldn't be sent to the server
 * This removes large data like files (base64) and transient state like appState
 * 
 * Why exclude files?
 * - Files are stored as base64 data URLs which can be very large (MBs per file)
 * - AI processing doesn't need file content, only project structure
 * - Reduces network traffic and server memory usage
 * - Files remain local to the client for rendering
 * 
 * @param project The full project data
 * @returns Project data safe for server communication
 */
export function createServerSafeProject(project: Project): Omit<Project, 'files' | 'appState'> {
  const { files, appState, ...serverSafeProject } = project;
  return serverSafeProject;
}

/**
 * Estimates the size of project data in bytes for debugging/monitoring
 * @param project The project to measure
 * @returns Estimated size in bytes
 */
export function estimateProjectSize(project: Project): { total: number; files: number; other: number } {
  const projectString = JSON.stringify(project);
  const total = new Blob([projectString]).size;
  
  const filesString = JSON.stringify(project.files || []);
  const files = new Blob([filesString]).size;
  
  const other = total - files;
  
  return { total, files, other };
}