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

  const { projectId, prompt, projectData, apiKey } = ensureArgsSchemaOrThrowHttpError(
    processVideoAIPromptSchema,
    rawArgs
  );

  try {
    console.log('Processing video AI prompt:', prompt);

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
    const aiResponse = await generateVideoEditSuggestions(prompt, project, apiKey);

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
 * @param userApiKey Optional user-provided API key
 * @returns AI response with message and suggested project updates
 */
async function generateVideoEditSuggestions(prompt: string, project: any, userApiKey?: string) {
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
    const completion = await openAiClient.chat.completions.create({
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
