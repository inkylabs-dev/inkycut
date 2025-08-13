/**
 * Client-side OpenAI integration with streaming support and Agent tools
 * This module provides direct OpenAI API access from the browser for Agent mode
 */
import OpenAI from 'openai';
import type { Project, CompositionElement, CompositionPage } from '../../composition/types';
import { createServerSafeProject } from './projectUtils';

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any, context: ToolExecutionContext) => Promise<any>;
}

export interface ToolExecutionContext {
  project: Project;
  updateProject: (project: Project) => void;
  addMessage: (message: string) => void;
  setIsStreaming?: (streaming: boolean) => void;
  agentSettings?: {
    maxSteps: number;
    temperature: number;
    model: string;
  };
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    parameters: any;
    result?: any;
    error?: string;
  }>;
}

/**
 * Client-side AI handler for Agent mode
 */
export class ClientAI {
  private client: OpenAI | null = null;
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    this.registerDefaultTools();
    this.registerSlashCommandTools();
  }

  /**
   * Initialize OpenAI client with user's API key
   */
  initialize(apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true // Enable client-side usage
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return false;
    }
  }

  /**
   * Check if client is initialized and ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Register a new tool for agent use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all registered tools in OpenAI format
   */
  private getOpenAITools(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Stream agent response with multi-step tool execution until goal is met
   */
  async *streamAgentResponse(
    message: string,
    context: ToolExecutionContext
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please provide your API key in Settings.');
    }

    const maxSteps = context.agentSettings?.maxSteps || 8; // Configurable via settings
    const steps: Array<{ step: number; action: string; description: string; reasoning: string }> = [];
    let currentProject = { ...context.project };
    let stepCount = 0;
    let allContent = `# 🤖 Agent Working on: "${message}"\n\n`;

    try {
      while (stepCount < maxSteps) {
        stepCount++;
        
        // Update context with current project state
        const updatedContext = { ...context, project: currentProject };
        const serverSafeProject = createServerSafeProject(currentProject);

        allContent += `## Step ${stepCount}/${maxSteps}\n\n`;
        yield { content: allContent, isComplete: false };

        // Build conversation for this step
        const messages = [
          {
            role: 'system' as const,
            content: this.getMultiStepAgentPrompt()
          },
          {
            role: 'user' as const,
            content: `Current project state: ${JSON.stringify(serverSafeProject, null, 2)}

Original goal: ${message}

Steps completed so far: ${JSON.stringify(steps)}

Current step: ${stepCount}/${maxSteps}

What should I do next to achieve the goal? Use tools to make progress or indicate if the goal is complete.`
          }
        ];

        const stream = await this.client.chat.completions.create({
          model: context.agentSettings?.model || 'gpt-4o',
          messages,
          tools: this.getOpenAITools(),
          tool_choice: 'auto',
          stream: true,
          temperature: context.agentSettings?.temperature || 0.7
        });

        let stepContent = '';
        let toolCalls: Array<{ id: string; name: string; parameters: string; }> = [];
        let currentToolCall: { id: string; name: string; parameters: string; } | null = null;
        let goalComplete = false;

        // Process streaming response
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            stepContent += delta.content;
            
            // Check for goal completion markers
            if (stepContent.toLowerCase().includes('goal complete') || 
                stepContent.toLowerCase().includes('goal achieved') ||
                stepContent.toLowerCase().includes('task complete')) {
              goalComplete = true;
            }

            allContent = allContent.substring(0, allContent.lastIndexOf(`## Step ${stepCount}`)) + 
                        `## Step ${stepCount}/${maxSteps}\n\n${stepContent}`;
            yield { content: allContent, isComplete: false };
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.id && toolCall.function?.name) {
                currentToolCall = {
                  id: toolCall.id,
                  name: toolCall.function.name,
                  parameters: toolCall.function.arguments || ''
                };
              } else if (currentToolCall && toolCall.function?.arguments) {
                currentToolCall.parameters += toolCall.function.arguments;
              }
            }
          }

          if (currentToolCall && chunk.choices[0]?.finish_reason === 'tool_calls') {
            toolCalls.push(currentToolCall);
            currentToolCall = null;
          }
        }

        // Execute tool calls for this step
        const executedToolCalls: Array<{
          id: string;
          name: string;
          parameters: any;
          result?: any;
          error?: string;
        }> = [];

        let toolExecutionDetails = '';
        
        for (const toolCall of toolCalls) {
          try {
            const tool = this.tools.get(toolCall.name);
            if (!tool) {
              throw new Error(`Tool "${toolCall.name}" not found`);
            }

            const parameters = JSON.parse(toolCall.parameters);
            
            // Show brief execution status
            allContent += `\n\n🔧 **Executing**: ${toolCall.name}...`;
            yield { content: allContent, isComplete: false };

            const result = await tool.execute(parameters, updatedContext);

            executedToolCalls.push({
              id: toolCall.id,
              name: toolCall.name,
              parameters,
              result
            });

            // Add detailed execution info to collapsible section
            toolExecutionDetails += `### 🔧 ${toolCall.name}\n`;
            toolExecutionDetails += `**Parameters**: \`\`\`json\n${JSON.stringify(parameters, null, 2)}\n\`\`\`\n`;
            toolExecutionDetails += `**Result**: \`\`\`json\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n\`\`\`\n\n`;

            // Show brief success status
            allContent = allContent.replace(`🔧 **Executing**: ${toolCall.name}...`, `✅ **Completed**: ${toolCall.name}`);
            yield { content: allContent, isComplete: false };

          } catch (error) {
            executedToolCalls.push({
              id: toolCall.id,
              name: toolCall.name,
              parameters: JSON.parse(toolCall.parameters || '{}'),
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Add error details to collapsed section
            toolExecutionDetails += `### ❌ ${toolCall.name} (Error)\n`;
            toolExecutionDetails += `**Parameters**: \`\`\`json\n${JSON.stringify(JSON.parse(toolCall.parameters || '{}'), null, 2)}\n\`\`\`\n`;
            toolExecutionDetails += `**Error**: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;

            // Show brief error status
            allContent = allContent.replace(`🔧 **Executing**: ${toolCall.name}...`, `❌ **Failed**: ${toolCall.name}`);
            yield { content: allContent, isComplete: false };
          }
        }

        // Add collapsible tool execution details if any tools were executed
        if (toolExecutionDetails) {
          allContent += `\n\n<details>\n<summary>🔍 **View Tool Execution Details** (${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''})</summary>\n\n${toolExecutionDetails}</details>\n`;
          yield { content: allContent, isComplete: false };
        }

        // Record this step
        steps.push({
          step: stepCount,
          action: toolCalls.length > 0 ? toolCalls[0].name : 'analysis',
          description: stepContent.split('\n')[0] || `Step ${stepCount} completed`,
          reasoning: stepContent
        });

        // Check if goal is complete
        if (goalComplete || stepContent.toLowerCase().includes('no further changes needed')) {
          allContent += `\n\n## ✅ Goal Achieved!\n\n`;
          allContent += `**Summary of completed steps:**\n`;
          steps.forEach((step, i) => {
            allContent += `${i + 1}. ${step.description}\n`;
          });
          
          // Final response
          yield {
            content: allContent,
            isComplete: true,
            toolCalls: executedToolCalls
          };
          return;
        }

        // Add step separator
        allContent += `\n\n---\n\n`;
        yield { content: allContent, isComplete: false };
      }

      // If we've reached max steps without completion
      allContent += `\n\n## ⏱️ Reached Step Limit\n\n`;
      allContent += `Made significant progress towards your goal, but reached the step limit (${maxSteps} steps).\n\n`;
      allContent += `**Steps completed:**\n`;
      steps.forEach((step, i) => {
        allContent += `${i + 1}. ${step.description}\n`;
      });
      allContent += `\nYou can continue by making another request.`;

      yield {
        content: allContent,
        isComplete: true
      };

    } catch (error) {
      throw new Error(`Multi-step agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system prompt for multi-step Agent mode
   */
  private getMultiStepAgentPrompt(): string {
    return `You are an advanced Video Editing Agent, a specialized AI assistant for the InkyCut video editor. You operate in an autonomous agent mode, working systematically until user requests are completely resolved.

<core_identity>
You are a video editing specialist agent that works autonomously in the InkyCut video editor. Your role is to:
- Execute multi-step video editing workflows systematically
- Break down complex video editing requests into actionable steps
- Use available tools strategically to achieve user goals
- Maximize understanding of video project context before taking action
- Prioritize autonomous problem resolution
</core_identity>

<communication>
- Use clear, structured markdown in your responses
- Provide step-by-step explanations of your actions, like "Now I'll"
- Show progress indicators for multi-step workflows
- Use emojis appropriately for visual clarity (🎬 🎥 ✅ 🔧 📝)
- Format code snippets and data structures clearly
- Explain technical concepts in accessible terms
</communication>

<tool_calling>
FUNDAMENTAL PRINCIPLE: Use tools strategically to achieve user goals. Always start by reading the project state to understand the current context.

AVAILABLE CORE TOOLS:
- readProject: Get current project structure and composition (ALWAYS use this first)
- readComposition: Read specific pages or elements by ID for detailed analysis
- analyzeProject: Analyze project structure and provide insights/recommendations

AVAILABLE SLASH COMMAND TOOLS:
- slash_reset: Reset project to default state
- slash_new_page: Add new blank pages to composition
- slash_del_page: Delete pages from composition  
- slash_zoom_tl: Set timeline zoom level for better editing precision
- slash_set_page: Modify page properties (ID, name, duration, background, position)
- slash_new_text: Add new text elements to selected page with styling options
- slash_new_image: Add new image elements to selected page from URLs
- slash_new_video: Add new video elements to selected page from URLs
- slash_del_elem: Delete elements from composition by ID
- slash_set_text: Modify properties of text elements (content, styling, position)
- slash_set_image: Modify properties of image elements (source, dimensions, position)
- slash_set_video: Modify properties of video elements (source, dimensions, timing, position)
- slash_set_comp: Modify composition properties (project title, fps, dimensions)
- slash_ls_comp: List composition overview with basic page information (IDs only)
- slash_ls_page: List detailed information for a specific page or selected page
- slash_export: Export project in various formats (JSON, MP4, WebM)
- slash_share: Create shareable encrypted links for projects

Tool usage guidelines:
- Start every workflow with readProject to understand current state
- Use specific tools based on the exact user requirement
- Combine multiple tools when necessary for complex operations
- Always validate results after making changes
- Use analyzeProject for providing recommendations and insights
</tool_calling>

<maximize_context_understanding>
Before taking any action, thoroughly understand the video project context:

1. READ PROJECT STATE: Always use readProject first to understand:
   - Current composition structure (pages, elements, timing)
   - Existing content and layout
   - Project settings (fps, dimensions, duration)
   - Available assets and files

2. ANALYZE REQUIREMENTS: Break down user requests into specific actions:
   - Identify what needs to be created, modified, or removed
   - Understand timing and positioning requirements
   - Consider visual design and animation needs
   - Plan optimal workflow sequence

3. SEMANTIC SEARCH APPROACH: When working with video projects:
   - Look for patterns in element naming and organization
   - Understand the narrative flow and visual hierarchy
   - Consider user intent behind design choices
   - Identify opportunities for consistency and improvement

4. CONTEXTUAL DECISION MAKING: Consider:
   - Project complexity and scope
   - User skill level and preferences
   - Best practices for video editing workflows
   - Performance and optimization considerations
</maximize_context_understanding>

<making_video_edits>
When creating or modifying video content:

ELEMENT SPECIFICATIONS:
- text: { type: "text", text: string, fontSize?: number, color?: string, fontFamily?: string, fontWeight?: string, textAlign?: "left"|"center"|"right" }
- image: { type: "image", src: string }
- video: { type: "video", src: string }
- group: { type: "group", elements: CompositionElement[] }

REQUIRED PROPERTIES: All elements need positioning and sizing:
- left, top: Position coordinates
- width, height: Element dimensions

OPTIONAL ENHANCEMENTS:
- rotation: Rotation angle in degrees
- opacity: Transparency (0-1)
- zIndex: Layer stacking order
- delay: Animation delay in milliseconds
- animation: Animation configuration object

ANIMATION SYSTEM:
- Structure: { duration: number, props: { [property]: [from, to] }, ease?: string, delay?: number, loop?: boolean }
- Common animations: fade in/out, slide transitions, scale effects, rotation
- Timing considerations: Coordinate with page duration and other elements

PAGE MANAGEMENT:
- Each page has: id, name, duration (milliseconds), backgroundColor, elements[]
- Page sequencing affects overall video flow
- Consider transitions between pages for smooth playback

COMPOSITION SETTINGS:
- fps: Frame rate (typically 30)
- width/height: Video dimensions (default 1920x1080)
- Overall project timing and pacing
</making_video_edits>

<workflow_execution>
SYSTEMATIC APPROACH:
1. 🔍 ANALYZE: Read project state and understand user goals
2. 📋 PLAN: Break down complex requests into logical steps
3. 🛠️ EXECUTE: Use tools systematically to make progress
4. ✅ VALIDATE: Check results and ensure quality
5. 🎯 ITERATE: Continue until goal is completely achieved

DECISION MAKING PRINCIPLES:
- Be methodical and logical in your approach
- Make one meaningful change per step
- Explain reasoning for each action
- Validate results before proceeding
- Maintain project consistency and best practices

GOAL COMPLETION:
When the user's goal is fully achieved, clearly state "GOAL COMPLETE" or "GOAL ACHIEVED" in your response. Provide a summary of what was accomplished.
</workflow_execution>

<autonomous_operation>
You operate with high autonomy to completely resolve user requests:
- Continue working until the task is fully complete
- Make reasonable assumptions when details are unclear
- Suggest improvements and best practices proactively
- Handle edge cases and potential issues preemptively
- Provide educational context to help users learn

MULTI-STEP EXECUTION:
- Maximum steps configured per agent run
- Each step builds toward the final goal
- Track progress and remaining work clearly
- Adapt approach based on intermediate results
- Maintain focus on user's primary objective
</autonomous_operation>

Remember: You are a powerful, autonomous video editing agent. Work systematically, use tools strategically, and don't stop until the user's video editing goal is completely achieved. Be thorough, educational, and helpful in your approach.`;
  }

  /**
   * Register slash command as agent tool
   */
  private registerSlashCommandTool(commandName: string, commandDescription: string, parameters: any): void {
    this.registerTool({
      name: `slash_${commandName}`,
      description: `Execute /${commandName} slash command: ${commandDescription}`,
      parameters,
      execute: async (params: any, context: ToolExecutionContext) => {
        try {
          // Import slash command functions dynamically
          const { executeSlashCommand } = await import('./clientSlashCommands');
          
          // Build args array from parameters
          const args: string[] = [];
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (key.length === 1) {
                args.push(`-${key}`, String(value));
              } else {
                args.push(`--${key}`, String(value));
              }
            }
          });

          // Create slash command context
          const slashContext = {
            project: context.project,
            updateProject: context.updateProject,
            addMessage: context.addMessage,
            args
          };

          // Execute the slash command
          const result = await executeSlashCommand(commandName, args, slashContext);
          
          return {
            success: result.success,
            message: result.message,
            handled: result.handled
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to execute /${commandName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            handled: true
          };
        }
      }
    });
  }

  /**
   * Register all available slash commands as agent tools
   */
  private registerSlashCommandTools(): void {
    // Register slash commands as tools with their specific parameters
    this.registerSlashCommandTool('reset', 'Reset project to default state', {
      type: 'object',
      properties: {},
      required: []
    });

    this.registerSlashCommandTool('new-page', 'Add new blank pages to composition', {
      type: 'object',
      properties: {
        num: { type: 'number', description: 'Number of pages to add (1-20)' }
      }
    });

    this.registerSlashCommandTool('del-page', 'Delete pages from composition', {
      type: 'object',
      properties: {
        num: { type: 'number', description: 'Number of pages to delete starting from selected page (1-50)' }
      }
    });

    this.registerSlashCommandTool('zoom-tl', 'Set timeline zoom level for better editing precision', {
      type: 'object',
      properties: {
        percentage: { type: 'string', description: 'Zoom percentage (10-1000%), e.g., "50%" or "150"' }
      },
      required: ['percentage']
    });

    this.registerSlashCommandTool('set-page', 'Modify page properties (ID, name, duration, background, position)', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'New page ID (must be unique)' },
        name: { type: 'string', description: 'Page name/title' },
        duration: { type: 'string', description: 'Page duration (e.g., "5000", "5s", "1.5m")' },
        'background-color': { type: 'string', description: 'Background color (hex, RGB, or CSS color name)' },
        after: { type: 'string', description: 'Move page after specified page ID or position number' },
        before: { type: 'string', description: 'Move page before specified page ID or position number' }
      }
    });

    this.registerSlashCommandTool('export', 'Export project in various formats', {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'mp4', 'webm'], description: 'Export format' },
        yes: { type: 'boolean', description: 'Skip dialog and export directly (JSON only)' }
      }
    });

    this.registerSlashCommandTool('share', 'Create shareable encrypted links for projects', {
      type: 'object',
      properties: {
        yes: { type: 'boolean', description: 'Skip dialog and share directly' }
      }
    });

    this.registerSlashCommandTool('new-text', 'Add a new text element to the selected page', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content for the element (use quotes for multi-word text)' },
        'font-size': { type: 'number', description: 'Font size in pixels (positive number)' },
        color: { type: 'string', description: 'Text color (hex, RGB, or CSS color name)' },
        'font-family': { type: 'string', description: 'Font family specification' },
        'font-weight': { type: 'string', description: 'Font weight (normal, bold, or numeric values)' },
        'text-align': { type: 'string', enum: ['left', 'center', 'right'], description: 'Text alignment' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' }
      }
    });

    this.registerSlashCommandTool('new-image', 'Add a new image element to the selected page', {
      type: 'object',
      properties: {
        src: { type: 'string', description: 'Image source URL (web URL or local file path)' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' },
        height: { type: 'number', description: 'Element height in pixels (positive number)' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Element opacity (0.0 to 1.0)' },
        rotation: { type: 'number', description: 'Rotation angle in degrees' }
      },
      required: ['src']
    });

    this.registerSlashCommandTool('new-video', 'Add a new video element to the selected page', {
      type: 'object',
      properties: {
        src: { type: 'string', description: 'Video source URL (web URL or local file path)' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' },
        height: { type: 'number', description: 'Element height in pixels (positive number)' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Element opacity (0.0 to 1.0)' },
        rotation: { type: 'number', description: 'Rotation angle in degrees' },
        delay: { type: 'number', minimum: 0, description: 'Animation delay in milliseconds (non-negative)' }
      },
      required: ['src']
    });

    this.registerSlashCommandTool('del-elem', 'Delete an element from the composition by ID or delete the selected element', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Element ID to delete (e.g., text-1234567890-abc123). If not provided, deletes the selected element.' },
        yes: { type: 'boolean', description: 'Skip confirmation dialog and delete immediately' }
      }
    });

    this.registerSlashCommandTool('set-text', 'Modify properties of a text element (text content, styling, position)', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Element ID to modify. If not provided, modifies the selected element.' },
        text: { type: 'string', description: 'New text content for the element (use quotes for multi-word text)' },
        'font-size': { type: 'number', description: 'Font size in pixels (positive number)' },
        color: { type: 'string', description: 'Text color (hex, RGB, or CSS color name)' },
        'font-family': { type: 'string', description: 'Font family specification' },
        'font-weight': { type: 'string', description: 'Font weight (normal, bold, or numeric values)' },
        'text-align': { type: 'string', enum: ['left', 'center', 'right'], description: 'Text alignment' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Element opacity (0.0 to 1.0)' },
        rotation: { type: 'number', description: 'Rotation angle in degrees' }
      }
    });

    this.registerSlashCommandTool('set-image', 'Modify properties of an image element (source, dimensions, position)', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Element ID to modify. If not provided, modifies the selected element.' },
        src: { type: 'string', description: 'New image source URL (web URL or local file path)' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' },
        height: { type: 'number', description: 'Element height in pixels (positive number)' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Element opacity (0.0 to 1.0)' },
        rotation: { type: 'number', description: 'Rotation angle in degrees' }
      }
    });

    this.registerSlashCommandTool('set-video', 'Modify properties of a video element (source, dimensions, timing, position)', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Element ID to modify. If not provided, modifies the selected element.' },
        src: { type: 'string', description: 'New video source URL (web URL or local file path)' },
        left: { type: 'number', description: 'X-coordinate position in pixels' },
        top: { type: 'number', description: 'Y-coordinate position in pixels' },
        width: { type: 'number', description: 'Element width in pixels (positive number)' },
        height: { type: 'number', description: 'Element height in pixels (positive number)' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Element opacity (0.0 to 1.0)' },
        rotation: { type: 'number', description: 'Rotation angle in degrees' },
        delay: { type: 'number', minimum: 0, description: 'Animation delay in milliseconds (non-negative)' }
      }
    });

    this.registerSlashCommandTool('set-comp', 'Modify composition properties (project title, fps, dimensions)', {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'New project title' },
        fps: { type: 'number', minimum: 1, maximum: 120, description: 'Frames per second (1-120)' },
        width: { type: 'number', minimum: 1, maximum: 7680, description: 'Composition width in pixels (1-7680)' },
        height: { type: 'number', minimum: 1, maximum: 4320, description: 'Composition height in pixels (1-4320)' }
      }
    });

    this.registerSlashCommandTool('ls-comp', 'List composition overview with basic page information (IDs only)', {
      type: 'object',
      properties: {},
      required: []
    });

    this.registerSlashCommandTool('ls-page', 'List detailed information for a specific page or selected page', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID to inspect. If not provided, uses the currently selected page.' }
      }
    });

    this.registerSlashCommandTool('ls-files', 'List all file metadata from the current project storage', {
      type: 'object',
      properties: {},
      required: []
    });

    this.registerSlashCommandTool('new-note', 'Add a new note to the project at a specific time (defaults to current player time)', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Note text content' },
        time: { type: 'string', description: 'Optional time in milliseconds or with "s" suffix for seconds (e.g., "1000" or "1.5s"). Defaults to current player time if not specified.' }
      },
      required: ['text']
    });

    this.registerSlashCommandTool('ls-notes', 'List all notes in the project with optional text search', {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search query to filter notes by text content' }
      }
    });

    this.registerSlashCommandTool('set-note', 'Modify properties of an existing note', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID to modify' },
        time: { type: 'string', description: 'New time in milliseconds or with "s" suffix for seconds' },
        text: { type: 'string', description: 'New note text content' }
      },
      required: ['id']
    });

    this.registerSlashCommandTool('del-note', 'Delete a note from the project by ID', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID to delete' }
      },
      required: ['id']
    });
  }

  /**
   * Register default tools for video editing
   */
  private registerDefaultTools(): void {
    // Read Project Tool
    this.registerTool({
      name: 'readProject',
      description: 'Get the current project structure including all pages, elements, and metadata',
      parameters: {
        type: 'object',
        properties: {
          includeFiles: {
            type: 'boolean',
            description: 'Whether to include file information in the response'
          }
        }
      },
      execute: async (params: { includeFiles?: boolean }, context: ToolExecutionContext) => {
        const { includeFiles = false } = params;
        const project = context.project;
        
        if (includeFiles) {
          return {
            projectSummary: {
              name: project.name,
              id: project.id,
              pages: project.composition?.pages.length || 0,
              totalElements: project.composition?.pages.reduce((sum, page) => sum + page.elements.length, 0) || 0,
              resolution: `${project.composition?.width}x${project.composition?.height}`,
              fps: project.composition?.fps
            },
            composition: createServerSafeProject(project),
            files: project.files?.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size })) || []
          };
        }
        
        return createServerSafeProject(project);
      }
    });

    // Read Composition Tool
    this.registerTool({
      name: 'readComposition',
      description: 'Read specific composition data like pages or elements',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'string',
            description: 'Specific page ID to read (optional)'
          },
          elementId: {
            type: 'string',
            description: 'Specific element ID to read (optional)'
          }
        }
      },
      execute: async (params: { pageId?: string; elementId?: string }, context: ToolExecutionContext) => {
        const { pageId, elementId } = params;
        const composition = context.project.composition;
        
        if (!composition) {
          return { error: 'No composition found in project' };
        }

        if (elementId) {
          // Find element across all pages
          for (const page of composition.pages) {
            const element = page.elements.find(el => el.id === elementId);
            if (element) {
              return { element, pageId: page.id };
            }
          }
          return { error: `Element with ID ${elementId} not found` };
        }

        if (pageId) {
          const page = composition.pages.find(p => p.id === pageId);
          return page ? { page } : { error: `Page with ID ${pageId} not found` };
        }

        return { composition };
      }
    });

    // Analyze Project Tool
    this.registerTool({
      name: 'analyzeProject',
      description: 'Analyze project structure and provide insights',
      parameters: {
        type: 'object',
        properties: {
          includeRecommendations: {
            type: 'boolean',
            description: 'Whether to include improvement recommendations'
          }
        }
      },
      execute: async (params: { includeRecommendations?: boolean }, context: ToolExecutionContext) => {
        const project = context.project;
        const composition = project.composition;
        
        if (!composition) {
          return { error: 'No composition found in project' };
        }

        const analysis = {
          projectStats: {
            name: project.name,
            pages: composition.pages.length,
            totalElements: composition.pages.reduce((sum, page) => sum + page.elements.length, 0),
            resolution: `${composition.width}x${composition.height}`,
            fps: composition.fps,
            totalDuration: composition.pages.reduce((sum, page) => sum + (page.duration || 0), 0)
          },
          elementBreakdown: composition.pages.map(page => ({
            pageId: page.id,
            name: page.name,
            duration: page.duration,
            elementCount: page.elements.length,
            elementTypes: page.elements.reduce((acc, el) => {
              acc[el.type] = (acc[el.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          })),
          insights: [
            `Project contains ${composition.pages.length} page(s)`,
            `Total of ${composition.pages.reduce((sum, page) => sum + page.elements.length, 0)} elements`,
            `Video resolution: ${composition.width}x${composition.height} at ${composition.fps}fps`,
            `Total duration: ${(composition.pages.reduce((sum, page) => sum + (page.duration || 0), 0) / (composition.fps || 30)).toFixed(1)}s`
          ]
        };

        if (params.includeRecommendations) {
          (analysis as any).recommendations = this.generateRecommendations(composition);
        }

        return analysis;
      }
    });
  }

  /**
   * Generate project recommendations
   */
  private generateRecommendations(composition: any): string[] {
    const recommendations: string[] = [];
    
    // Check for pages with too many elements
    const busyPages = composition.pages.filter((page: any) => page.elements.length > 10);
    if (busyPages.length > 0) {
      recommendations.push('Consider breaking down pages with many elements for better performance');
    }

    // Check for very short pages
    const shortPages = composition.pages.filter((page: any) => (page.duration || 0) < 30); // Less than 1 second at 30fps
    if (shortPages.length > 0) {
      recommendations.push('Some pages have very short durations - consider extending for better readability');
    }

    // Check resolution
    if (composition.width < 1920 || composition.height < 1080) {
      recommendations.push('Consider using higher resolution (1920x1080 or above) for better quality');
    }

    return recommendations;
  }
}

// Export singleton instance
export const clientAI = new ClientAI();