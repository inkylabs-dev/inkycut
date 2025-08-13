// Placeholder wasp operations for blog
// These are temporary stubs that return errors as requested

export interface ProcessVideoAIPromptArgs {
  projectId: string;
  prompt: string;
  projectData: any;
  apiKey: string;
  chatMode: 'edit' | 'ask' | 'agent';
}

export interface ProcessVideoAIPromptResponse {
  message: string;
  updatedProject: any | null;
}

export interface ShareProjectArgs {
  encryptedData: string;
  projectName: string;
}

export interface ShareProjectResponse {
  shareId: string;
}

export async function processVideoAIPrompt(args: ProcessVideoAIPromptArgs): Promise<ProcessVideoAIPromptResponse> {
  throw new Error('Not implemented');
}

export async function shareProject(args: ShareProjectArgs): Promise<ShareProjectResponse> {
  throw new Error('Not implemented');
}
