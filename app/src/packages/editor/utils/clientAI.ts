/**
 * Client-side OpenAI integration with streaming support and Agent tools
 * This module provides direct OpenAI API access from the browser for Agent mode
 */
import OpenAI from 'openai';
import { Project, CompositionElement, CompositionPage } from '../types';
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

    const maxSteps = 5; // Prevent infinite loops
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
          model: 'gpt-4o',
          messages,
          tools: this.getOpenAITools(),
          tool_choice: 'auto',
          stream: true,
          temperature: 0.7
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
            
            // Update current project if the tool modified it
            if (toolCall.name === 'editProject' && result.success) {
              currentProject = updatedContext.project;
            }

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
    return `You are a Video Editing Agent that executes multi-step workflows to achieve user goals. Your role is to break down complex requests into actionable steps and execute them systematically until the goal is met.

WORKFLOW APPROACH:
1. Analyze the user's goal and current project state
2. Determine the next logical step needed
3. Use tools to execute that step
4. Evaluate if the goal is complete or if more steps are needed
5. Continue until goal is achieved or maximum steps reached

AVAILABLE TOOLS:
- readProject: Get current project structure and composition (use this first to understand the project)
- readComposition: Read specific pages or elements by ID
- editProject: Modify project with actions: updateElement, addElement, deleteElement, updatePage, addPage, deletePage, updateComposition
- writeToStorage: Save data to localStorage for persistence
- analyzeProject: Analyze project structure and provide insights/recommendations

EDITING ACTIONS AVAILABLE:
- addPage: Add new page - use target.data with page properties (name, duration, backgroundColor, elements)
- addElement: Add element to page - use target.pageId and target.data with element properties (type, left, top, width, height, etc.)
- updateElement: Update existing element - use target.id and target.data with new properties
- updatePage: Update page properties - use target.id and target.data
- deleteElement: Delete element - use target.id
- deletePage: Delete page - use target.id (cannot delete last page)
- updateComposition: Update composition settings - use target.data with fps, width, height

DECISION MAKING:
- Be methodical and logical in your approach
- Make one meaningful change per step
- Explain your reasoning for each step
- Use tools to make progress toward the goal
- Check if the goal is complete after each step
- Indicate completion clearly when the goal is fully achieved

ELEMENT TYPES & PROPERTIES:
- text: { type: "text", text: string, fontSize?: number, color?: string, fontFamily?: string, fontWeight?: string, textAlign?: "left"|"center"|"right" }
- image: { type: "image", src: string }
- video: { type: "video", src: string }
- group: { type: "group", elements: CompositionElement[] }

All elements need: left, top, width, height (positioning and size)
Optional: rotation, opacity, zIndex, delay, animation

ANIMATIONS:
- { duration: number, props: { opacity: [0, 1] }, ease?: string, delay?: number, loop?: boolean }
- Common animations: fade in/out, slide, scale, rotate

GOAL COMPLETION:
When the user's goal is fully achieved, clearly state "GOAL COMPLETE" or "GOAL ACHIEVED" in your response.

Remember: You are executing multiple steps to achieve a complex goal. Be systematic and thorough!`;
  }

  /**
   * Get system prompt for Agent mode (legacy single-step)
   */
  private getAgentSystemPrompt(): string {
    return `You are a Video Editing Agent for the Vibe video editor. Your role is to help users achieve their video editing goals by using the available tools to read, analyze, and modify their video projects.

AVAILABLE TOOLS:
- readProject: Get current project structure and composition (use this first to understand the project)
- readComposition: Read specific pages or elements by ID
- editProject: Modify project with actions: updateElement, addElement, deleteElement, updatePage, addPage, deletePage, updateComposition
- writeToStorage: Save data to localStorage for persistence
- analyzeProject: Analyze project structure and provide insights/recommendations

EDITING ACTIONS AVAILABLE:
- addPage: Add new page - use target.data with page properties (name, duration, backgroundColor, elements)
- addElement: Add element to page - use target.pageId and target.data with element properties (type, left, top, width, height, etc.)
- updateElement: Update existing element - use target.id and target.data with new properties
- updatePage: Update page properties - use target.id and target.data
- deleteElement: Delete element - use target.id
- deletePage: Delete page - use target.id (cannot delete last page)
- updateComposition: Update composition settings - use target.data with fps, width, height

CAPABILITIES:
- Read and understand video project structures
- Modify video elements (text, images, videos, groups)
- Adjust animations, timing, and positioning
- Create new elements and pages
- Analyze project complexity and provide recommendations
- Maintain project consistency and best practices

BEHAVIOR:
- Always use tools to interact with the project
- Provide clear explanations of what you're doing
- Ask for clarification when requests are ambiguous
- Suggest improvements and best practices
- Be helpful and educational

RESPONSE FORMAT:
- Use tools first to understand the current state
- Explain your actions clearly
- Provide context for your changes
- Offer additional suggestions when relevant

Remember: You are executing on the client-side with direct access to the user's project data. Be precise and helpful!`;
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

    // Edit Project Tool
    this.registerTool({
      name: 'editProject',
      description: 'Modify project elements, pages, or composition settings',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['updateElement', 'addElement', 'deleteElement', 'updatePage', 'addPage', 'deletePage', 'updateComposition'],
            description: 'The type of edit action to perform'
          },
          target: {
            type: 'object',
            description: 'Target object (element, page, or composition data)',
            properties: {
              id: { type: 'string' },
              data: { type: 'object' }
            }
          }
        },
        required: ['action', 'target']
      },
      execute: async (params: { action: string; target: any }, context: ToolExecutionContext) => {
        const { action, target } = params;
        let project = { ...context.project };

        switch (action) {
          case 'updateElement':
            if (!target.id || !target.data) {
              throw new Error('Element ID and data required for updateElement action');
            }
            
            // Find and update element
            for (const page of project.composition?.pages || []) {
              const elementIndex = page.elements.findIndex(el => el.id === target.id);
              if (elementIndex !== -1) {
                page.elements[elementIndex] = { ...page.elements[elementIndex], ...target.data };
                context.updateProject(project);
                return { success: true, message: `Updated element ${target.id}` };
              }
            }
            throw new Error(`Element ${target.id} not found`);

          case 'addElement':
            if (!target.pageId || !target.data) {
              throw new Error('Page ID and element data required for addElement action');
            }
            
            const page = project.composition?.pages.find(p => p.id === target.pageId);
            if (!page) {
              throw new Error(`Page ${target.pageId} not found`);
            }
            
            const newElement = {
              id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...target.data
            };
            page.elements.push(newElement);
            context.updateProject(project);
            return { success: true, message: `Added element to page ${target.pageId}`, elementId: newElement.id };

          case 'addPage':
            if (!target.data) {
              throw new Error('Page data required for addPage action');
            }
            
            if (!project.composition) {
              project.composition = {
                pages: [],
                fps: 30,
                width: 1920,
                height: 1080
              };
            }
            
            const newPage = {
              id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: target.data.name || `Page ${project.composition.pages.length + 1}`,
              duration: target.data.duration || 5000,
              backgroundColor: target.data.backgroundColor || 'white',
              elements: target.data.elements || [],
              ...target.data
            };
            
            project.composition.pages.push(newPage);
            context.updateProject(project);
            return { success: true, message: `Added new page: ${newPage.name}`, pageId: newPage.id };

          case 'updatePage':
            if (!target.id || !target.data) {
              throw new Error('Page ID and data required for updatePage action');
            }
            
            const pageToUpdate = project.composition?.pages.find(p => p.id === target.id);
            if (!pageToUpdate) {
              throw new Error(`Page ${target.id} not found`);
            }
            
            Object.assign(pageToUpdate, target.data);
            context.updateProject(project);
            return { success: true, message: `Updated page ${target.id}` };

          case 'deletePage':
            if (!target.id) {
              throw new Error('Page ID required for deletePage action');
            }
            
            if (!project.composition?.pages) {
              throw new Error('No pages found in project');
            }
            
            const pageIndex = project.composition.pages.findIndex(p => p.id === target.id);
            if (pageIndex === -1) {
              throw new Error(`Page ${target.id} not found`);
            }
            
            if (project.composition.pages.length === 1) {
              throw new Error('Cannot delete the last page');
            }
            
            project.composition.pages.splice(pageIndex, 1);
            context.updateProject(project);
            return { success: true, message: `Deleted page ${target.id}` };

          case 'deleteElement':
            if (!target.id) {
              throw new Error('Element ID required for deleteElement action');
            }
            
            for (const page of project.composition?.pages || []) {
              const elementIndex = page.elements.findIndex(el => el.id === target.id);
              if (elementIndex !== -1) {
                page.elements.splice(elementIndex, 1);
                context.updateProject(project);
                return { success: true, message: `Deleted element ${target.id}` };
              }
            }
            throw new Error(`Element ${target.id} not found`);

          case 'updateComposition':
            if (!target.data) {
              throw new Error('Composition data required for updateComposition action');
            }
            
            if (!project.composition) {
              project.composition = {
                pages: [],
                fps: 30,
                width: 1920,
                height: 1080
              };
            }
            
            Object.assign(project.composition, target.data);
            context.updateProject(project);
            return { success: true, message: 'Updated composition settings' };

          default:
            throw new Error(`Action ${action} not implemented`);
        }
      }
    });

    // Write to Storage Tool
    this.registerTool({
      name: 'writeToStorage',
      description: 'Save data to localStorage for persistence',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Storage key to save data under'
          },
          data: {
            type: 'object',
            description: 'Data to save to localStorage'
          }
        },
        required: ['key', 'data']
      },
      execute: async (params: { key: string; data: any }, context: ToolExecutionContext) => {
        const { key, data } = params;
        
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return { success: true, message: `Data saved to localStorage under key: ${key}` };
        } catch (error) {
          throw new Error(`Failed to save to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
            `Total duration: ${(composition.pages.reduce((sum, page) => sum + (page.duration || 0), 0) / 1000).toFixed(1)}s`
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
    const shortPages = composition.pages.filter((page: any) => (page.duration || 0) < 1000);
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