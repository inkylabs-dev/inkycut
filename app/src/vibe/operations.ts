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
  chatMode: z.enum(['edit', 'ask', 'agent']).optional().default('edit'), // Chat mode: edit (modify project), ask (information only), or agent (multi-step execution)
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
 * Supports three modes:
 * - edit: Single-step project modification
 * - ask: Information and analysis only (no modifications)
 * - agent: Multi-step execution until goal is achieved
 *
 * @param args The input data including projectId, prompt, and current project data
 * @param context The operation context containing user authentication data
 * @returns Updated project data with AI-suggested changes, command results, or agent execution results
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
    let aiResponse;
    
    if (chatMode === 'agent') {
      // Agent mode: Run a sequence of operations until goal is met
      aiResponse = await runAgentMode(prompt, project, apiKey, context.user);
    } else {
      // Regular edit or ask mode
      aiResponse = await generateVideoEditSuggestions(prompt, project, apiKey, chatMode);
    }

    if (!aiResponse) {
      throw new HttpError(500, 'Failed to generate AI response');
    }

    // Since we need to ensure both operations are Prisma Client promises,
    // we'll handle them separately instead of using a transaction
    try {
      // Only decrement credits if user is not using their own API key
      if (!apiKey || apiKey.trim() === '') {
        // For agent mode, deduct credits based on number of steps taken
        const creditsToDeduct = chatMode === 'agent' && aiResponse.agentSteps 
          ? Math.min(aiResponse.agentSteps.length, 5) // Cap at 5 credits max
          : 1; // Regular mode uses 1 credit
          
        await context.entities.User.update({
          where: { id: context.user.id },
          data: {
            credits: {
              decrement: creditsToDeduct,
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
      updatedProject: (chatMode === 'edit' || chatMode === 'agent') ? aiResponse.updatedProject : undefined,
      changes: aiResponse.changes,
      agentSteps: aiResponse.agentSteps, // Include agent steps if available
      goalComplete: aiResponse.goalComplete, // Include goal completion status
    };
  } catch (error: unknown) {
    console.error('Error in processVideoAIPrompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpError(500, `AI processing failed: ${errorMessage}`);
  }
};

/**
 * Run Agent mode: Execute a sequence of operations until the user's goal is met
 * 
 * @param prompt User's goal/request
 * @param project Current project data
 * @param userApiKey Optional user-provided API key
 * @param user User context for credit management
 * @returns Final AI response with all changes made
 */
async function runAgentMode(prompt: string, project: any, userApiKey?: string, user?: User) {
  const maxSteps = 5; // Prevent infinite loops
  const steps: any[] = [];
  let currentProject = { ...project };
  let allChanges: any[] = [];
  let stepCount = 0;
  
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

    while (stepCount < maxSteps) {
      stepCount++;
      
      // Use full original project data except for appState and files
      const { appState, files, ...simplifiedProject } = currentProject;

      const completion = await openAiClient.chat.completions.create({
        model: 'gpt-4-0613',
        messages: [
          {
            role: 'system',
            content: getAgentModeSystemPrompt(),
          },
          {
            role: 'user',
            content: `My video project: ${JSON.stringify(simplifiedProject)}
            
Original goal: ${prompt}

Steps completed so far: ${JSON.stringify(steps)}

Current step: ${stepCount}/${maxSteps}

What should I do next to achieve the goal? If the goal is complete, respond with "GOAL_COMPLETE".`,
          },
        ],
        tools: getAgentModeTools(),
        tool_choice: { type: "function" as const, function: { name: "agentStep" } },
        temperature: 0.7,
      });

      const aiResponse = completion?.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const result = aiResponse ? JSON.parse(aiResponse) : null;
      
      if (!result) {
        throw new Error('Failed to get valid response from AI agent');
      }

      // Check if goal is complete
      if (result.goalComplete || result.action === 'GOAL_COMPLETE') {
        return {
          message: `Goal achieved! ${result.message}\n\nSteps completed:\n${steps.map((step, i) => `${i + 1}. ${step.description}`).join('\n')}`,
          updatedProject: currentProject,
          changes: allChanges,
          agentSteps: steps,
          goalComplete: true
        };
      }

      // Record this step
      steps.push({
        step: stepCount,
        action: result.action,
        description: result.description,
        reasoning: result.reasoning
      });

      // Apply changes if any
      if (result.updatedProject) {
        currentProject = result.updatedProject;
      }
      
      if (result.changes && result.changes.length > 0) {
        allChanges = [...allChanges, ...result.changes];
      }

      // Check if agent decided to stop
      if (result.shouldStop) {
        break;
      }
    }

    // If we've reached max steps without completion
    return {
      message: `Made significant progress towards your goal, but reached the step limit (${maxSteps} steps). Here's what was accomplished:\n\n${steps.map((step, i) => `${i + 1}. ${step.description}`).join('\n')}\n\nYou can continue by making another request.`,
      updatedProject: currentProject,
      changes: allChanges,
      agentSteps: steps,
      goalComplete: false
    };

  } catch (error) {
    console.error('Error in agent mode:', error);
    throw error;
  }
}

/**
 * Get system prompt for Agent mode
 */
function getAgentModeSystemPrompt(): string {
  return 'You are an AI video editing agent that executes a sequence of operations to achieve user goals. ' +
    'Your job is to break down complex requests into actionable steps and execute them one by one until the goal is met.\n\n' +
    'AGENT WORKFLOW:\n' +
    '1. Analyze the user\'s goal and current project state\n' +
    '2. Determine the next logical step needed\n' +
    '3. Execute that step by modifying the project\n' +
    '4. Evaluate if the goal is complete or if more steps are needed\n' +
    '5. Continue until goal is achieved or maximum steps reached\n\n' +
    'COMPOSITION SCHEMA:\n' +
    'A video project consists of:\n' +
    '- composition: { pages: CompositionPage[], fps: number, width: number, height: number }\n' +
    '- CompositionPage: { id: string, name: string, duration: number, backgroundColor?: string, elements: CompositionElement[] }\n' +
    '- CompositionElement: {\n' +
    '  id: string, type: "video"|"image"|"text"|"group", left: number, top: number, width: number, height: number,\n' +
    '  rotation?: number, opacity?: number, zIndex?: number, delay?: number (in frames),\n' +
    '  src?: string (for video/image), elements?: CompositionElement[] (for group),\n' +
    '  text?: string, fontSize?: number, fontFamily?: string, color?: string,\n' +
    '  fontWeight?: string, textAlign?: "left"|"center"|"right",\n' +
    '  animation?: { props?, duration? (in frames), ease?, delay? (in frames), alternate?, loop?, autoplay? }\n' +
    '}\n\n' +
    'AGENT DECISION MAKING:\n' +
    '- Be methodical and logical in your approach\n' +
    '- Make one meaningful change per step\n' +
    '- Explain your reasoning for each step\n' +
    '- Check if the goal is complete after each step\n' +
    '- Stop when the user\'s goal is fully achieved\n\n' +
    'EXAMPLE MULTI-STEP GOALS:\n' +
    '- "Create a title sequence": 1) Add title text, 2) Position it, 3) Add fade-in animation, 4) Add background\n' +
    '- "Make it more engaging": 1) Analyze current content, 2) Add animations, 3) Improve timing, 4) Add effects\n' +
    '- "Fix the layout": 1) Identify layout issues, 2) Reposition elements, 3) Adjust sizing, 4) Improve alignment';
}

/**
 * Get tools for Agent mode
 */
function getAgentModeTools() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'agentStep',
        description: 'Execute one step in the agent workflow towards achieving the user\'s goal',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The action being taken in this step (e.g., "add_title", "adjust_timing", "GOAL_COMPLETE")',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of what this step accomplishes',
            },
            reasoning: {
              type: 'string',
              description: 'Explanation of why this step is necessary to achieve the goal',
            },
            message: {
              type: 'string',
              description: 'Message to the user about this step or completion',
            },
            updatedProject: {
              type: 'object',
              description: 'Updated project data after this step (if changes were made)',
              properties: {
                composition: {
                  type: 'object',
                  properties: {
                    pages: {
                      type: 'array',
                      description: 'Array of composition pages with updated elements',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
            changes: {
              type: 'array',
              description: 'List of changes made in this step',
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
                    description: 'Type of element affected',
                  },
                  elementId: {
                    type: 'string',
                    description: 'ID of the element that was changed',
                  },
                  description: {
                    type: 'string',
                    description: 'Description of the change',
                  },
                },
              },
            },
            goalComplete: {
              type: 'boolean',
              description: 'Whether the user\'s goal has been fully achieved',
            },
            shouldStop: {
              type: 'boolean',
              description: 'Whether the agent should stop (goal complete or requires user input)',
            },
          },
          required: ['action', 'description', 'reasoning', 'message', 'goalComplete', 'shouldStop'],
        },
      },
    },
  ];
}

/**
 * Generate video editing suggestions using OpenAI
 *
 * @param prompt User's prompt about video editing
 * @param project Current project data
 * @param userApiKey Optional user-provided API key
 * @param chatMode Chat mode: 'edit' for modifications or 'ask' for information only
 * @returns AI response with message and suggested project updates
 */
async function generateVideoEditSuggestions(prompt: string, project: any, userApiKey?: string, chatMode: 'edit' | 'ask' | 'agent' = 'edit') {
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
    '  id: string, type: "video"|"image"|"text"|"group", left: number, top: number, width: number, height: number,\n' +
    '  rotation?: number, opacity?: number, zIndex?: number, delay?: number (in frames),\n' +
    '  src?: string (for video/image), elements?: CompositionElement[] (for group - child elements with absolute positioning),\n' +
    '  text?: string, fontSize?: number, fontFamily?: string, color?: string,\n' +
    '  fontWeight?: string, textAlign?: "left"|"center"|"right", isDragging?: boolean,\n' +
    '  animation?: {\n' +
    '    props?: Record<string, any>, duration?: number (in frames), ease?: string,\n' +
    '    delay?: number (in frames), alternate?: boolean, loop?: boolean|number, autoplay?: boolean\n' +
    '  }\n' +
    '}\n\n' +
    'GROUP ELEMENT NOTES:\n' +
    '- Group elements contain child elements in the "elements" property\n' +
    '- Child elements use absolute positioning with their original left/top/width/height values\n' +
    '- The group automatically calculates scale based on child bounds vs group dimensions\n' +
    '- Natural group bounds = max(childLeft + childWidth), max(childTop + childHeight)\n' +
    '- Scale = min(groupWidth/naturalWidth, groupHeight/naturalHeight)\n' +
    '- Groups can contain any element type, including other groups (nesting supported)\n' +
    '- Groups act as containers that clip and scale their children to fit\n\n' +
    'ANIMATION EXAMPLES:\n' +
    '- Fade in: { duration: 30, props: { opacity: [0, 1] } } // 1 second at 30fps\n' +
    '- Slide from left: { duration: 30, props: { translateX: [-100, 0] } } // 1 second at 30fps\n' +
    '- Scale up: { duration: 30, props: { scale: [0.5, 1] } } // 1 second at 30fps\n' +
    '- Rotate: { duration: 60, props: { rotate: "1turn" } } // 2 seconds at 30fps\n' +
    '- Bounce: { duration: 30, ease: "easeOutBounce", props: { translateY: [-50, 0] } } // 1 second at 30fps\n\n' +
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
    '  id, type: "video"|"image"|"text"|"group", left, top, width, height,\n' +
    '  rotation?, opacity?, zIndex?, delay? (milliseconds),\n' +
    '  src? (for video/image), elements? (for group - child elements with absolute positioning, auto-scaled),\n' +
    '  text?, fontSize?, fontFamily?, color?, fontWeight?, textAlign?: "left"|"center"|"right",\n' +
    '  animation?: { props?, duration? (in frames), ease?, delay? (in frames), alternate?, loop?, autoplay? }\n' +
    '}\n\n' +
    'GROUP ELEMENTS: Groups contain child elements positioned absolutely. The group auto-scales to fit children within allocated bounds.\n\n' +
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
                    description: 'Type of element affected (text, image, video, group, etc.)',
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
