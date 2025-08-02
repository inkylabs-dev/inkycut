/**
 * Shared types for slash commands system
 */

export interface SlashCommandContext {
  project: any;
  updateProject: (project: any) => void;
  addMessage: (content: string) => void;
  clearAllFiles?: () => Promise<void>;
  setChatMessages?: (messages: any[]) => void;
  setSelectedPage?: (page: any) => void;
  setSelectedElement?: (element: any) => void;
  setIsSharedProject?: (isShared: boolean) => void;
  setShowImportDialog?: (show: boolean) => void;
  setShowExportDialog?: (show: boolean) => void;
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void;
  triggerExport?: () => void;
  fileStorage?: any;
  setShowShareDialog?: (show: boolean) => void;
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>;
  args?: string[];
}

export interface SlashCommandResult {
  success: boolean;
  message: string;
  handled: boolean;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  execute: (context: SlashCommandContext) => Promise<SlashCommandResult>;
}