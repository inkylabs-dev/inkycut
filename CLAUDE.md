# InkyCut Project Guide for AI Assistants

 InkyCut is an innovative AI-powered video editing app that reimagines video creation through conversational interfaces and command-driven workflows.

## Project Overview

**InkyCut** is a revolutionary video editing platform that replaces traditional timeline-based editing with:
- **Lean UI**: Clean, minimal interface showing video composition as structured data
- **Slash Commands**: Powerful command palette for direct action execution (`/new-text`, `/set-video`, etc.)
- **AI Agent**: Smart assistant that translates creative intent into command sequences

### Core Philosophy
> "Lean UI, powerful commands, smart orchestration" - Create videos through conversation, not complex interfaces.

## Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript with Remotion for video rendering
- **Backend**: Node.js/Wasp framework with Prisma ORM
- **Database**: PostgreSQL
- **Video Rendering**: Remotion-based composition system
- **AI Integration**: OpenAI/Claude models with custom tool calling
- **Deployment**: Fly.io for app (separate client/server configs) and Netlify for blog.

### Project Structure
```
/
├── app/                    # Main Wasp application
│   ├── main.wasp          # Wasp configuration
│   ├── serverSetup.js     # Server setup for express server
│   ├── schema.prisma      # Database schema
│   ├── src/
│   │   ├── vibe/          # Core video editing logic
│   │   ├── packages/      # Editor utilities and components
│   │   ├── client/        # React frontend components
│   │   └── server/        # Backend operations
├── blog/                  # Astro-based documentation site
├── e2e-tests/            # Playwright test suite
└── inkycut/              # Legacy/reference implementation
```

## Core Concepts

### 1. Video Composition System
Videos are represented as JSON compositions using TypeScript interfaces defined in `app/src/packages/editor/types.ts`. The core structure includes:

- **CompositionData**: The entire video composition with pages, fps, and canvas dimensions
- **CompositionPage**: Individual scenes/sections with duration, background, and elements
- **CompositionElement**: Individual video elements (text, image, video, audio, group) with positioning, styling, and animation properties

Key interfaces:
- `CompositionData` - Root composition structure
- `CompositionPage` - Individual pages/scenes
- `CompositionElement` - All element types with comprehensive properties
- `AppState` - UI state management

See `app/src/packages/editor/types.ts` for complete type definitions and detailed property documentation.

### 2. Slash Command System
InkyCut uses a comprehensive slash command system for all editing operations. All available commands are implemented in `app/src/packages/editor/utils/clientSlashCommands.ts`.

#### Command Categories
The system includes commands for:
- **Project Management**: Reset, import/export, sharing
- **Page Operations**: Create, delete, modify pages
- **Element Creation**: Add text, images, videos, audio elements
- **Element Modification**: Update properties, positioning, styling
- **Composition Settings**: Change fps, dimensions, project title
- **Navigation**: Zoom, timeline control

#### Command Structure
All commands follow consistent patterns:
- Options use `--flag` or `-f` syntax
- Element IDs are auto-generated: `{type}-{timestamp}-{random}`
- Commands provide detailed success/error feedback with emojis
- Smart defaults (auto-centering, aspect ratio preservation)
- Comprehensive help and usage information

See `app/src/packages/editor/utils/clientSlashCommands.ts` for the complete implementation of all available commands.

### 3. AI Integration Modes
InkyCut supports three AI interaction modes:

#### Edit Mode (`chatMode: 'edit'`)
- Single-step project modifications
- Direct composition changes
- Best for specific, targeted edits

#### Ask Mode (`chatMode: 'ask'`)
- Information and analysis only
- No project modifications
- Project insights and recommendations

#### Agent Mode (`chatMode: 'agent'`)
- Multi-step autonomous execution
- Complex workflow orchestration
- Continues until goal is achieved

### 4. Client-Side AI System
The `ClientAI` class (`app/src/packages/editor/utils/clientAI.ts`) handles:
- Slash command registration as AI tools
- Multi-step workflow execution
- Project state management
- Tool orchestration for complex edits

## Development Guidelines

### Working with Video Compositions

1. **Always Read Project State First**
   ```typescript
   // Use readProject tool to understand current composition
   const projectState = await tools.readProject();
   ```

2. **Understand Element Positioning**
   - Coordinates are in pixels from top-left (0,0)
   - Default composition: 1920x1080 at 30fps
   - Elements require positioning (`left`, `top`) and sizing (`width`, `height`)
   - See `CompositionElement` interface in `types.ts` for all available properties

3. **Handle Element IDs Properly**
   - Auto-generated format: `type-{timestamp}-{random}`
   - Use specific IDs when modifying existing elements
   - Commands can target selected elements without IDs

### Slash Command Development

When creating or modifying slash commands:

1. **Follow Consistent Patterns**
   ```typescript
   const myCommand: SlashCommand = {
     name: 'my-command',
     description: 'Brief description',
     usage: '/my-command --option value',
     execute: async (context: SlashCommandContext) => {
       // Implementation
       return {
         success: boolean,
         message: string,
         handled: boolean
       };
     }
   };
   ```
   See existing commands in `clientSlashCommands.ts` for implementation patterns.

2. **Use Proper Error Handling**
   - Return descriptive error messages
   - Use emojis for visual clarity (✅ ❌ 🎬)
   - Handle edge cases gracefully

3. **Validate Input Parameters**
   - Check required options
   - Validate ranges and types
   - Provide helpful usage messages

### AI System Integration

1. **Tool Registration**
   ```typescript
   // Register slash commands as AI tools
   this.registerSlashCommandTool('command-name', 'description', {
     type: 'object',
     properties: {
       param: { type: 'string', description: 'Parameter description' }
     },
     required: ['param']
   });
   ```

2. **Context Management**
   - Always understand project state before modifications
   - Use `readProject` and `analyzeProject` tools effectively
   - Consider user intent and creative goals

3. **Multi-Step Workflows**
   - Break complex tasks into logical steps
   - Provide progress updates
   - Handle intermediate failures gracefully

## File Structure Guide

### Key Files to Understand

#### Core Video Editing
- `app/src/vibe/operations.ts` - Server-side AI operations and prompt processing
- `app/src/packages/editor/utils/clientAI.ts` - Client-side AI agent system
- `app/src/packages/editor/utils/clientSlashCommands.ts` - Slash command implementations
- `app/src/vibe/VibeEditorPage.tsx` - Main editor interface

#### Remotion Integration
- `app/src/vibe/components/` - Interactive video composition components
- `app/src/packages/render/` - Video rendering and export logic

#### Database & Auth
- `app/schema.prisma` - Database schema (Users, Projects, Files, etc.)
- `app/src/auth/` - Authentication handlers
- `app/src/server/` - Backend API operations

#### Documentation
- `blog/src/content/docs/` - User documentation and guides
- `blog/src/content/docs/general/slash-commands.md` - Complete slash command reference

### Configuration Files
- `app/main.wasp` - Wasp framework configuration
- `app/fly-*.toml` - Deployment configurations
- `app/package.json` - Dependencies and scripts

## Common Tasks & Patterns

### Adding New Slash Commands

1. **Define the Command**
   ```typescript
   // In clientSlashCommands.ts
   const newCommand: SlashCommand = {
     name: 'new-command',
     description: 'What it does',
     usage: '/new-command --option value',
     execute: async (context) => {
       // Implementation
     }
   };
   ```
   Follow the patterns established in `clientSlashCommands.ts` for consistency.

2. **Register with AI System**
   ```typescript
   // In clientAI.ts registerSlashCommandTools()
   this.registerSlashCommandTool('new-command', 'Description', schema);
   ```

3. **Add to Command Registry**
   ```typescript
   // In clientSlashCommands.ts commands array
   export const commands: SlashCommand[] = [
     // ... existing commands
     newCommand
   ];
   ```
   All commands must be exported in the `commands` array to be available in the application.

### Modifying Video Elements

1. **Find Elements by ID or Type**
   ```typescript
   const element = page.elements.find(el => el.id === targetId);
   const textElements = page.elements.filter(el => el.type === 'text');
   ```
   Element types are defined in the `CompositionElement` interface in `types.ts`.

2. **Update Properties Safely**
   ```typescript
   const updatedElement = {
     ...element,
     text: newText,
     fontSize: newSize
   };
   ```

3. **Validate Changes**
   ```typescript
   if (width <= 0) {
     return { success: false, message: '❌ Width must be positive' };
   }
   ```

### Working with AI Responses

1. **Structure Responses Clearly**
   ```typescript
   return {
     success: true,
     message: '✅ **Action Completed**\n\nDetails:\n• Item 1\n• Item 2',
     handled: true
   };
   ```

2. **Use Markdown Formatting**
   - `**Bold**` for headings and emphasis
   - `•` for bullet points
   - Code blocks for technical details
   - Emojis for visual clarity
   - Always document requirements, behaviors, specifications and manual to docs when updating code.

3. **Provide Context and Next Steps**
   - Explain what was changed
   - Suggest related actions
   - Include usage examples when helpful

## Testing & Quality Assurance

### Running Tests
```bash
# E2E tests
cd e2e-tests && npm test

# Type checking
cd app && npm run typecheck

# Build
cd app && npm run build

# Development server
cd app && npm run start
```

### Code Quality
- Use TypeScript strictly (no `any` types when possible)
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Test commands thoroughly with edge cases

## Deployment & Environment

### Environment Variables
- `OPENAI_API_KEY` - Server OpenAI API key
- `DATABASE_URL` - PostgreSQL connection
- `WASP_WEB_CLIENT_URL` - Frontend URL
- `WASP_SERVER_URL` - Backend API URL

## Best Practices

### For AI Assistants

1. **Understand Before Acting**
   - Read existing code patterns
   - Understand the composition structure
   - Consider user workflow implications

2. **Maintain Consistency**
   - Follow established naming conventions
   - Use similar error message formats
   - Respect the three-tier architecture (UI/Commands/AI)

3. **Consider Performance**
   - Minimize AI API calls
   - Use efficient data structures
   - Avoid unnecessary re-renders

4. **Document Changes**
   - Update relevant documentation
   - Add clear commit messages
   - Consider impact on existing features

### For Users

1. **Start Simple**
   - Begin with basic commands
   - Build complexity gradually
   - Use the AI agent for complex workflows

2. **Leverage Commands**
   - Learn key slash commands
   - Use autocomplete and fuzzy matching
   - Combine commands for efficiency

3. **Work with AI Modes**
   - Use Edit mode for modifications
   - Use Ask mode for analysis
   - Use Agent mode for complex tasks

## Resources & References

### Documentation
- [InkyCut Strategy](blog/src/content/docs/blog/the-inkycut-strategy.md) - Project vision and philosophy
- [Slash Commands Guide](blog/src/content/docs/general/slash-commands.md) - Complete command reference
- [AI Modes Guide](blog/src/content/docs/blog/introducing-ai-modes.md) - AI interaction patterns

### External Dependencies
- [Wasp Framework](https://wasp.sh) - Full-stack framework
- [Remotion](https://remotion.dev) - Video composition and rendering
- [OpenAI API](hhttps://docs.opensaas.sh/llms-full.txt) - AI integration
- [Prisma](https://prisma.io) - Database ORM

### Development URLs
- Development: `http://localhost:3000`
- Production: `https://inkycut.com`
- API: `https://api.inkycut.com`

---

## Getting Started Checklist

When working on InkyCut:

- [ ] Understand the core philosophy: lean UI + powerful commands + smart AI
- [ ] Familiarize yourself with the composition data structure
- [ ] Learn the slash command patterns and conventions
- [ ] Understand the three AI modes (edit/ask/agent)
- [ ] Review existing command implementations for patterns
- [ ] Test changes with both simple and complex scenarios
- [ ] Consider the impact on user workflow and creative process
- [ ] Update documentation when adding new features

Remember: InkyCut is about empowering creativity through intelligent interfaces. Every change should make video editing more intuitive, powerful, and accessible to creators of all skill levels.
