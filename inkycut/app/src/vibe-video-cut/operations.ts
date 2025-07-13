import type {
  CreateVibeProject,
  UpdateVibeProject,
  GetVibeProject,
  GetUserVibeProjects,
} from 'wasp/server/operations';
import type { User } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';
import * as z from 'zod';
import OpenAI from 'openai';
import { SubscriptionStatus } from '../payment/plans';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { processSlashCommand } from './slashCommands';

// OpenAI client setup
const openAi = setUpOpenAi();

function setUpOpenAi(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error('OpenAI API key is not set');
  }
  return new OpenAI(
    baseURL
      ? { apiKey, baseURL }
      : { apiKey }
  );
}

/**
 * In-memory storage for vibe video cut projects
 * Used for demo purposes instead of a permanent database storage
 * @type {Map<string, any>} - Map of project IDs to project data
 */
const vibeProjects: Map<string, any> = new Map();

/**
 * In-memory storage for render tasks
 * Exported for Server-Sent Events (SSE) endpoint to track rendering progress
 * @type {Map<string, any>} - Map of render task IDs to task status data
 */
export const renderTasks: Map<string, any> = new Map();

//#region AI Video Editing Operations

// Video AI processing schema for input validation
const processVideoAIPromptSchema = z.object({
  projectId: z.string().nonempty(),
  prompt: z.string().nonempty(),
  projectData: z.any(),
});

type ProcessVideoAIPromptInput = z.infer<typeof processVideoAIPromptSchema>;

// Check if user is eligible for AI features (has credits or active subscription)
function isEligibleForAIFeatures(user: User): boolean {
  const isUserSubscribed =
    user.subscriptionStatus === SubscriptionStatus.Active ||
    user.subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd;
  const userHasCredits = user.credits > 0;
  return isUserSubscribed || userHasCredits;
}

/**
 * Process video editing AI prompt or slash command and return suggested edits or command results
 *
 * @param args The input data including projectId, prompt, and current project data
 * @param context The operation context containing user authentication data
 * @returns Updated project data with AI-suggested changes or command results
 * @throws HttpError if user is not authenticated or not eligible for AI features
 */
export const processVideoAIPrompt = async (
  rawArgs: any,
  context: { user?: User; entities: any }
) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users can access AI features');
  }

  if (!isEligibleForAIFeatures(context.user)) {
    throw new HttpError(402, 'User has not paid or is out of credits');
  }

  const { projectId, prompt, projectData } = ensureArgsSchemaOrThrowHttpError(
    processVideoAIPromptSchema,
    rawArgs
  );

  try {
    console.log('Processing video AI prompt:', prompt);

    // Get current project data from memory store or use provided data
    const project = vibeProjects.get(projectId) || projectData;

    if (!project) {
      throw new HttpError(404, 'Project not found');
    }

    // Check if this is a slash command
    if (prompt.trim().startsWith('/')) {
      // Extract the command without the leading slash
      const command = prompt.trim().substring(1);
      
      // Process the slash command
      try {
        const commandResponse = await processSlashCommand(command, project, context.user, context);
        return {
          message: commandResponse.message,
          commandResult: commandResponse,
          isCommandResult: true
        };
      } catch (commandError: any) {
        throw new HttpError(400, `Command error: ${commandError.message}`);
      }
    }
    
    // If not a slash command, proceed with normal AI processing
    const aiResponse = await generateVideoEditSuggestions(prompt, project);

    if (!aiResponse) {
      throw new HttpError(500, 'Failed to generate AI response');
    }

    // Since we need to ensure both operations are Prisma Client promises,
    // we'll handle them separately instead of using a transaction
    try {
      // Decrement the user's credits
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
      
      // Create a record of this AI interaction if the entity exists
      if (context.entities.AiInteraction) {
        await context.entities.AiInteraction.create({
          data: {
            user: { connect: { id: context.user.id } },
            prompt,
            response: JSON.stringify(aiResponse),
            type: 'VIDEO_EDITING',
            projectId,
          },
        });
      }
    } catch (error) {
      console.error('Error updating user credits or creating AI interaction:', error);
      // Continue even if operations fail (the AI response is still valuable to the user)
    }

    // Store updated project data in the in-memory map
    if (aiResponse.updatedProject) {
      vibeProjects.set(projectId, {
        ...project,
        ...aiResponse.updatedProject,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      message: aiResponse.message,
      updatedProject: aiResponse.updatedProject,
      changes: aiResponse.changes,
    };
  } catch (error: unknown) {
    console.error('Error in processVideoAIPrompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpError(500, `AI processing failed: ${errorMessage}`);
  }
};

/**
 * Generate video editing suggestions using OpenAI
 *
 * @param prompt User's prompt about video editing
 * @param project Current project data
 * @returns AI response with message and suggested project updates
 */
async function generateVideoEditSuggestions(prompt: string, project: any) {
  try {
    // Use full original project data except for appState
    const { appState, ...simplifiedProject } = project;

    const functionDef = {
      name: "edit_json",
      description: "Edit the JSON object based on user instructions",
      parameters: {
        type: "object",
        properties: {
          edited_json: {
            type: "object",
            description: "The updated version of the input JSON"
          }
        },
        required: ["edited_json"]
      }
    };
    const completion = await openAi.chat.completions.create({
      model: 'gpt-4-0613', // Use a more capable model for creative tasks
      messages: [
        {
          role: 'system',
          content:
            'You are an expert video editor AI assistant. Your job is to help users edit their video projects by suggesting changes and improvements. ' +
            'You will be given the current state of a video project and a request from the user. ' +
            'Provide clear, specific advice and modifications to the project based on the user\'s request. ' +
            'Your suggestions should be actionable and technically feasible within the constraints of the project.' +
            'You should call changeVideoSchema tool to apply changes.',
        },
        {
          role: 'user',
          content: `My video project: ${JSON.stringify(
            simplifiedProject
          )}. My request: ${prompt}`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'changeVideoSchema',
            description:
              'Process video editing suggestions and return modified project',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description:
                    'A helpful response to the user explaining the suggested changes',
                },
                updatedProject: {
                  type: 'object',
                  description: 'Updated project data with suggested changes',
                  properties: {
                    composition: {
                      type: 'object',
                      properties: {
                        pages: {
                          type: 'array',
                          description:
                            'Array of composition pages with updated elements',
                          items: {
                            type: 'object',
                          },
                        },
                      },
                    },
                  },
                },
                changes: {
                  type: 'array',
                  description: 'List of changes made to the project',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['add', 'modify', 'delete'],
                        description: 'Type of change made',
                      },
                      elementType: {
                        type: 'string',
                        description: 'Type of element affected (text, image, video, etc.)',
                      },
                      elementId: {
                        type: 'string',
                        description: 'ID of the element that was changed',
                      },
                      description: {
                        type: 'string',
                        description: 'Human-readable description of the change',
                      },
                    },
                  },
                },
              },
              required: ['message', 'changes'],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "changeVideoSchema" } },
      temperature: 1,
    });
    console.log(JSON.stringify(completion, null, 2));

    const aiResponse = completion?.choices[0]?.message?.tool_calls?.[0]?.function
      ?.arguments;
    const result = aiResponse ? JSON.parse(aiResponse) : null;
    return result;
  } catch (error) {
    console.error('Error generating video edit suggestions:', error);
    throw error;
  }
}

//#endregion

/**
 * Creates a new vibe video cut project for the authenticated user
 *
 * @param args - Project creation arguments
 * @param args.id - Optional custom project ID
 * @param args.name - Optional project name (defaults to 'Untitled Project')
 * @param args.propertiesEnabled - Whether advanced properties editing is enabled
 * @param context - Operation context containing user authentication data
 * @returns The newly created project object
 * @throws Error if user is not authenticated
 */
export const createVibeProject: CreateVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const projectId = typedArgs.id || Math.random().toString(36).substring(7);
  const newProject = {
    id: projectId,
    name: typedArgs.name || 'Untitled Project',
    userId: context.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [],
    assets: [],
    composition: null,
    // Server-side control for properties editing, default to false
    propertiesEnabled:
      typedArgs.propertiesEnabled !== undefined
        ? typedArgs.propertiesEnabled
        : false,
  };

  vibeProjects.set(projectId, newProject);
  return newProject;
};

/**
 * Updates an existing vibe video cut project
 *
 * @param args - Project update arguments
 * @param args.id - ID of the project to update
 * @param args.data - Project data to update
 * @param context - Operation context containing user authentication data
 * @returns The updated project object
 * @throws Error if user is not authenticated or if project is not found
 */
export const updateVibeProject: UpdateVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const project = vibeProjects.get(typedArgs.id);
  if (!project || project.userId !== context.user.id) {
    throw new Error('Project not found or access denied');
  }

  const updatedProject = {
    ...project,
    ...(typedArgs.name && { name: typedArgs.name }),
    ...(typedArgs.timeline && { timeline: typedArgs.timeline }),
    ...(typedArgs.assets && { assets: typedArgs.assets }),
    ...(typedArgs.composition && { composition: typedArgs.composition }),
    ...(typedArgs.propertiesEnabled !== undefined && {
      propertiesEnabled: typedArgs.propertiesEnabled,
    }),
    updatedAt: new Date().toISOString(),
  };

  vibeProjects.set(typedArgs.id, updatedProject);
  return updatedProject;
};

/**
 * Retrieves a specific vibe video cut project by ID
 *
 * @param args - Arguments containing the project ID
 * @param args.id - ID of the project to retrieve
 * @param context - Operation context containing user authentication data
 * @returns The project object or null if not found
 * @throws Error if user is not authenticated or if user doesn't have access to the project
 */
export const getVibeProject: GetVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const project = vibeProjects.get(typedArgs.id);
  if (!project) {
    return null;
  }

  if (project.userId !== context.user.id) {
    throw new Error('Access denied');
  }

  return project;
};

/**
 * Retrieves all vibe video cut projects belonging to the current user
 *
 * @param args - Not used but required by type definition
 * @param context - Operation context containing user authentication data
 * @returns Array of project objects sorted by last updated (newest first)
 * @throws Error if user is not authenticated
 */
export const getUserVibeProjects: GetUserVibeProjects = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const userProjects = Array.from(vibeProjects.values())
    .filter((project) => project.userId === context.user!.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return userProjects;
};

/**
 * Retrieves the progress of a specific rendering task
 *
 * @param args - Arguments containing the task ID
 * @param args.taskId - ID of the task to check progress for
 * @param context - Operation context containing user authentication data
 * @returns The task progress data
 * @throws Error if user is not authenticated
 */
export const getTaskProgress = async (
  args: { taskId: string },
  context: { user?: User }
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { taskId } = args;
  const task = renderTasks.get(taskId);

  if (!task) {
    throw new Error('Task not found');
  }

  if (task.userId !== context.user.id) {
    throw new Error('Access denied');
  }

  return {
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    videoUrl: task.videoUrl,
    error: task.error,
    updatedAt: task.updatedAt,
  };
};

// Add a function to render the project
export const renderVibeProject = async (
  args: any,
  context: any
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const projectId = typedArgs.projectId;
  const projectData = typedArgs.projectData;

  if (!projectId || !projectData) {
    throw new Error('Missing project ID or project data');
  }

  const project = vibeProjects.get(projectId);
  if (!project || project.userId !== context.user.id) {
    throw new Error('Project not found or access denied');
  }

  // Generate a unique task ID
  const taskId = `task_${Math.random().toString(36).substring(2, 15)}`;

  // Create a new render task
  const renderTask = {
    id: taskId,
    projectId,
    userId: context.user.id,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    videoUrl: null,
    error: null,
  };

  // Store the task
  renderTasks.set(taskId, renderTask);

  // Start the rendering simulation process
  simulateRendering(taskId, projectData);

  return { taskId };
};

// Simulate video rendering process
function simulateRendering(taskId: string, projectData: any) {
  const totalSteps = 10;
  let currentStep = 0;

  const updateProgress = () => {
    currentStep++;
    const progress = Math.round((currentStep / totalSteps) * 100);

    const task = renderTasks.get(taskId);
    if (task) {
      task.status = currentStep < totalSteps ? 'processing' : 'completed';
      task.progress = progress;
      task.updatedAt = new Date().toISOString();

      if (currentStep === totalSteps) {
        // Generate a fake video URL when complete
        task.videoUrl = `https://example.com/videos/${taskId}.mp4`;
      }

      renderTasks.set(taskId, task);
    }

    if (currentStep < totalSteps) {
      setTimeout(updateProgress, 1000); // Update every second
    }
  };

  // Start the simulation
  setTimeout(updateProgress, 1000);
}

//#region Slash Commands
// Slash command functionality moved to slashCommands.ts
