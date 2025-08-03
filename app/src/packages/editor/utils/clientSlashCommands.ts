/**
 * Client-side Slash Commands System
 * 
 * This module handles client-side slash commands that execute immediately
 * without sending anything to the server. Commands are processed locally
 * and can interact with the project state through provided context.
 * 
 * NOTE: This file now re-exports from the modular commands/ directory
 * for backward compatibility while maintaining the new structure.
 */

// Re-export everything from the commands directory
export * from './commands';
