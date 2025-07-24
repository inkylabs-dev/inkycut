// Removed unused operation types
import type { User } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';
import * as z from 'zod';
import OpenAI from 'openai';
import { SubscriptionStatus } from '../payment/plans';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
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

//#region AI Video Editing Operations

// Video AI processing schema for input validation
const processVideoAIPromptSchema = z.object({
  projectId: z.string().nonempty(),
  prompt: z.string().nonempty(),
  projectData: z.any(),
  apiKey: z.string().optional(), // Optional user-provided API key
  chatMode: z.enum(['edit', 'ask']).optional().default('edit'), // Chat mode: edit (modify project) or ask (information only)
});

type ProcessVideoAIPromptInput = z.infer<typeof processVideoAIPromptSchema>;

// Check if user is eligible for AI features (has credits, active subscription, or BYO API key)
function isEligibleForAIFeatures(user: User, apiKey?: string): boolean {
  // If user brings their own OpenAI API key, skip credit check
  if (apiKey && apiKey.trim() !== '') {
    return true;
  }
  
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

  const { projectId, prompt, projectData, apiKey, chatMode } = ensureArgsSchemaOrThrowHttpError(
    processVideoAIPromptSchema,
    rawArgs
  );

  if (!isEligibleForAIFeatures(context.user, apiKey)) {
    throw new HttpError(402, 'User has not paid or is out of credits');
  }

  try {
    // Get current project data from memory store or use provided data
    const project = projectData;

    if (!project) {
      throw new HttpError(404, 'Project not found');
    }

    // Check if this is a slash command
    if (prompt.trim().startsWith('/')) {
      // Extract the command without the leading slash
      const command = prompt.trim().substring(1);
      
      // Process the slash command
      try {
        const commandResponse = await processSlashCommand(command, project);
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
    const aiResponse = await generateVideoEditSuggestions(prompt, project, apiKey, chatMode);

    if (!aiResponse) {
      throw new HttpError(500, 'Failed to generate AI response');
    }

    // Since we need to ensure both operations are Prisma Client promises,
    // we'll handle them separately instead of using a transaction
    try {
      // Only decrement credits if user is not using their own API key
      if (!apiKey || apiKey.trim() === '') {
        await context.entities.User.update({
          where: { id: context.user.id },
          data: {
            credits: {
              decrement: 1,
            },
          },
        });
      }
      
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

    return {
      message: aiResponse.message,
      updatedProject: chatMode === 'edit' ? aiResponse.updatedProject : undefined,
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
 * @param userApiKey Optional user-provided API key
 * @param chatMode Chat mode: 'edit' for modifications or 'ask' for information only
 * @returns AI response with message and suggested project updates
 */
async function generateVideoEditSuggestions(prompt: string, project: any, userApiKey?: string, chatMode: 'edit' | 'ask' = 'edit') {
  try {
    // Use user's API key if provided, otherwise fall back to server's API key
    const apiKeyToUse = userApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKeyToUse) {
      throw new Error('No OpenAI API key available. Please provide your API key in Settings.');
    }

    // Create OpenAI client with the appropriate API key
    const openAiClient = new OpenAI({
      apiKey: apiKeyToUse,
      baseURL: process.env.OPENAI_BASE_URL || undefined
    });

    // Use full original project data except for appState and files (to avoid sending large base64 data)
    const { appState, files, ...simplifiedProject } = project;

    // Create different system prompts and tools based on chat mode
    const systemPrompt = chatMode === 'ask' 
      ? getAskModeSystemPrompt()
      : getEditModeSystemPrompt();

    const tools = chatMode === 'ask'
      ? getAskModeTools()
      : getEditModeTools();

    const toolChoice = chatMode === 'ask'
      ? { type: "function" as const, function: { name: "analyzeVideoProject" } }
      : { type: "function" as const, function: { name: "changeVideoSchema" } };

    const completion = await openAiClient.chat.completions.create({
      model: 'gpt-4-0613', // Use a more capable model for creative tasks
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `My video project: ${JSON.stringify(
            simplifiedProject
          )}. My request: ${prompt}`,
        },
      ],
      tools,
      tool_choice: toolChoice,
      temperature: chatMode === 'ask' ? 0.3 : 1, // Lower temperature for Ask mode for more focused answers
    });
    const aiResponse = completion?.choices[0]?.message?.tool_calls?.[0]?.function
      ?.arguments;
    const result = aiResponse ? JSON.parse(aiResponse) : null;
    return result;
  } catch (error) {
    console.error('Error generating video edit suggestions:', error);
    throw error;
  }
}

/**
 * Get system prompt optimized for Edit mode (project modification)
 */
function getEditModeSystemPrompt(): string {
  return 'You are an expert video editor AI assistant. Your job is to help users edit their video projects by suggesting changes and improvements. ' +
    'You will be given the current state of a video project and a request from the user. ' +
    'Provide clear, specific advice and modifications to the project based on the user\'s request. ' +
    'Your suggestions should be actionable and technically feasible within the constraints of the project.\n\n' +
    'COMPOSITION SCHEMA:\n' +
    'A video project consists of:\n' +
    '- composition: { pages: CompositionPage[], fps: number, width: number, height: number }\n' +
    '- CompositionPage: { id: string, name: string, duration: number, backgroundColor?: string, elements: CompositionElement[] }\n' +
    '- CompositionElement: {\n' +
    '  id: string, type: "video"|"image"|"text", left: number, top: number, width: number, height: number,\n' +
    '  rotation?: number, opacity?: number, zIndex?: number, delay?: number (in milliseconds),\n' +
    '  src?: string (for video/image), text?: string, fontSize?: number, fontFamily?: string, color?: string,\n' +
    '  fontWeight?: string, textAlign?: "left"|"center"|"right", isDragging?: boolean,\n' +
    '  animation?: {\n' +
    '    props?: Record<string, any>, duration?: number, ease?: string,\n' +
    '    delay?: number, alternate?: boolean, loop?: boolean|number, autoplay?: boolean\n' +
    '  }\n' +
    '}\n\n' +
    'ANIMATION EXAMPLES:\n' +
    '- Fade in: { duration: 1000, props: { opacity: [0, 1] } }\n' +
    '- Slide from left: { duration: 1000, props: { translateX: [-100, 0] } }\n' +
    '- Scale up: { duration: 1000, props: { scale: [0.5, 1] } }\n' +
    '- Rotate: { duration: 2000, props: { rotate: "1turn" } }\n' +
    '- Bounce: { duration: 1000, ease: "easeOutBounce", props: { translateY: [-50, 0] } }\n\n' +
    'You should call changeVideoSchema tool to apply changes.';
}

/**
 * Get system prompt optimized for Ask mode (information and analysis only)
 */
function getAskModeSystemPrompt(): string {
  return 'You are an expert video editing consultant and analyzer. Your role is to provide detailed information, analysis, and insights about video projects without making any modifications. ' +
    'You will be given a video project and questions about it. Provide comprehensive, helpful answers that explain:\n' +
    '- Project structure and composition\n' +
    '- Element properties and configurations\n' +
    '- Animation details and timing\n' +
    '- Technical specifications\n' +
    '- Best practices and recommendations\n' +
    '- Potential improvements (as suggestions, not implementations)\n\n' +
    'COMPOSITION SCHEMA (for reference):\n' +
    'A video project consists of:\n' +
    '- composition: { pages: CompositionPage[], fps: number, width: number, height: number }\n' +
    '- CompositionPage: { id: string, name: string, duration: number, backgroundColor?, elements: CompositionElement[] }\n' +
    '- CompositionElement: {\n' +
    '  id, type: "video"|"image"|"text", left, top, width, height,\n' +
    '  rotation?, opacity?, zIndex?, delay? (milliseconds),\n' +
    '  src? (for video/image), text?, fontSize?, fontFamily?, color?,\n' +
    '  fontWeight?, textAlign?: "left"|"center"|"right",\n' +
    '  animation?: { props?, duration?, ease?, delay?, alternate?, loop?, autoplay? }\n' +
    '}\n\n' +
    'Focus on being informative, analytical, and educational. Do NOT suggest modifications - only provide insights and information.';
}

/**
 * Get tools for Edit mode (project modification)
 */
function getEditModeTools() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'changeVideoSchema',
        description: 'Process video editing suggestions and return modified project',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'A helpful response to the user explaining the suggested changes',
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
                      description: 'Array of composition pages with updated elements',
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
  ];
}

/**
 * Get tools for Ask mode (information and analysis only)
 */
function getAskModeTools() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'analyzeVideoProject',
        description: 'Analyze video project and provide detailed information without making modifications',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Comprehensive analysis and information about the project, answering the user\'s question in detail',
            },
            analysis: {
              type: 'object',
              description: 'Structured analysis of the project',
              properties: {
                projectStats: {
                  type: 'object',
                  description: 'Project statistics and overview',
                  properties: {
                    totalPages: { type: 'number' },
                    totalElements: { type: 'number' },
                    elementTypes: { type: 'object' },
                    totalDuration: { type: 'number' },
                    resolution: { type: 'string' },
                    fps: { type: 'number' }
                  }
                },
                insights: {
                  type: 'array',
                  description: 'Key insights about the project',
                  items: { type: 'string' }
                },
                recommendations: {
                  type: 'array',
                  description: 'Suggestions for improvement (informational only)',
                  items: { type: 'string' }
                }
              }
            },
            changes: {
              type: 'array',
              description: 'Empty array for Ask mode (no changes made)',
              items: { type: 'object' }
            }
          },
          required: ['message', 'changes'],
        },
      },
    },
  ];
}

//#endregion
