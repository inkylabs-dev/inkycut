---
title: Client-Side Slash Commands
description: Complete guide to slash commands - keyboard shortcuts for InkyCut's chat interface with autocomplete and fuzzy matching
---

# Client-Side Slash Commands

This document defines the behavior and implementation of client-side slash commands in the InkyCut video editor. These commands execute locally without sending data to the server, providing immediate responses for common operations.

## Overview

Client-side slash commands are special messages that begin with a forward slash (`/`) and trigger specific actions within the editor. They provide a quick way to perform common tasks without using the UI menus.

### Key Characteristics

- **Local Execution**: Commands run entirely client-side, no server communication
- **Immediate Response**: Actions execute instantly without AI processing delays
- **Chat Integration**: Commands are entered in the chat interface and results appear in the chat
- **Confirmation Support**: Destructive operations prompt for user confirmation
- **Extensible Architecture**: New commands can be easily added through the command registry
- **Autocomplete Support**: Type `/` to see available commands with fuzzy matching and keyboard navigation

## Autocomplete Features

When you type `/` in the chat input, an autocomplete dropdown appears with the following features:

### Smart Matching
- **Prefix matching**: `/res` matches `/reset`
- **Fuzzy matching**: `/rst` matches `/reset` (highlights matching characters)
- **Real-time filtering**: Results update as you type more characters

### Keyboard Navigation
- **Arrow Up/Down**: Navigate through command options
- **Enter**: Select the highlighted command and insert it into input
- **Escape**: Close the autocomplete dropdown
- **Click**: Select a command by clicking on it

### Visual Feedback
- **Highlighted selection**: Currently selected command has blue background
- **Character highlighting**: Matching characters are highlighted in yellow
- **Command details**: Shows command name, description, and usage pattern
- **Upward expansion**: Dropdown expands upward to avoid blocking input field

## Available Commands

### `/reset`

Resets the project to its default state, equivalent to clicking "Reset Project" in the menu.

**Usage:** `/reset`

**Behavior:**
- Prompts for confirmation with: "Are you sure you want to reset the project? All unsaved changes and files will be lost."
- If confirmed:
  - Clears all files from storage (IndexedDB for local projects, memory for shared projects)
  - Creates a new default project with default composition
  - Resets chat history to welcome message
  - Clears selected elements and pages
  - Converts shared projects to local projects
- If cancelled: Shows "Command Cancelled" message

**Response Messages:**
- Success: Silent (no message shown for clean reset experience)
- Error: "❌ **Reset Failed** - Failed to reset project. Please try again or use the Reset Project button in the menu."

### `/import`

Opens the Import Dialog to import a project from a JSON file, equivalent to clicking "Import Project" in the menu.

**Usage:** `/import`

**Behavior:**
- Opens the Import Dialog immediately
- No confirmation required (file selection serves as confirmation)
- Dialog allows drag-and-drop or file browser selection
- Supports `.json` files containing project data
- Validates project structure before importing
- Automatically imports files to IndexedDB storage
- Resets chat history with import success message
- Sets project to local mode (not shared)

**Response Messages:**
- Success: Silent (dialog handles the import process and feedback)
- Error: "❌ **Import Failed** - Failed to open import dialog. Please try using the Import button in the menu."
- Unavailable: "❌ **Import Unavailable** - Import functionality is not available in this context."

### `/export`

Exports the project or opens the Export Dialog with optional format selection and auto-export capability.

**Usage:** `/export [--format|-f json|mp4|webm] [--yes|-y]`

**Options:**
- `--format`, `-f`: Pre-select export format (json, mp4, webm). Default: json
- `--yes`, `-y`: Skip dialog and export directly (only works with JSON format currently)

**Behavior:**
- Without options: Opens Export Dialog with JSON format selected
- With `--format`: Opens Export Dialog with specified format pre-selected
- With `--yes` (JSON only): Performs direct export and download, bypassing dialog
- With `--yes` (MP4/WebM): Shows error message (direct video export not yet supported)

**Examples:**
- `/export` - Opens export dialog
- `/export --format mp4` - Opens dialog with MP4 pre-selected
- `/export -f json --yes` - Directly exports JSON file
- `/export -y` - Directly exports JSON file (default format)

**Response Messages:**
- Success (dialog): Silent or format confirmation message
- Success (direct export): "✅ **Export Complete** - Project exported as JSON file and downloaded successfully."
- Error (unsupported direct format): "❌ **Format Not Supported** - MP4/WebM direct export not yet supported."
- Error (invalid format): "❌ **Invalid Format** - Unsupported format 'xyz'. Supported: json, mp4, webm"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'"
- Unavailable: "❌ **Export Unavailable** - Export functionality is not available in this context."

### `/share`

Shares the project with a secure, encrypted link or opens the Share Dialog.

**Usage:** `/share [--yes|-y]`

**Options:**
- `--yes`, `-y`: Skip dialog and share directly, returning the shareable URL in chat

**Behavior:**
- Without options: Opens Share Dialog for interactive sharing
- With `--yes`: Performs direct sharing with end-to-end encryption and returns URL immediately
- Creates encrypted shareable link with embedded decryption key in URL fragment
- Uploads project data securely to server with end-to-end encryption

**Examples:**
- `/share` - Opens share dialog
- `/share --yes` - Directly shares and returns URL
- `/share -y` - Directly shares and returns URL (short form)

**Response Messages:**
- Success (dialog): Silent (dialog handles the sharing process)
- Success (direct share): "🔗 **Project Shared Successfully** - Your project has been shared with end-to-end encryption. Here's your secure shareable link: [URL]"
- Error: "❌ **Share Failed** - [Error details]"
- Unavailable: "❌ **Share Unavailable** - Share functionality is not available in this context."
- Unknown option: "❌ **Unknown Option** - Unknown option '--xyz'. Usage: /share [--yes]"

## Architecture

### Core Components

The slash command system consists of several key files:

#### `clientSlashCommands.ts`
- **Location**: `/app/src/packages/editor/utils/clientSlashCommands.ts`
- **Purpose**: Core slash command processing logic
- **Key Functions**:
  - `parseSlashCommand()`: Detects and parses slash commands from user input
  - `executeSlashCommand()`: Executes commands with proper context
  - `registerSlashCommand()`: Adds new commands to the registry
  - Command registry management and validation

#### `RightPanel.tsx`
- **Location**: `/app/src/packages/editor/RightPanel.tsx`
- **Purpose**: Chat interface integration
- **Integration Point**: `handleSendMessage()` function detects slash commands before AI processing
- **Context Provision**: Provides command execution context (project state, update functions)

#### Command Context Interface
```typescript
interface SlashCommandContext {
  project: any;                           // Current project state
  updateProject: (project: any) => void;  // Project update function
  addMessage: (content: string) => void;  // Add message to chat
  clearAllFiles?: () => Promise<void>;    // Clear all files from storage
  setChatMessages?: (messages: any[]) => void; // Set entire chat history
  setSelectedPage?: (page: any) => void;  // Update selected page
  setSelectedElement?: (element: any) => void; // Update selected element
  setIsSharedProject?: (isShared: boolean) => void; // Toggle project mode
  setShowImportDialog?: (show: boolean) => void; // Show/hide import dialog
  setShowExportDialog?: (show: boolean) => void; // Show/hide export dialog
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void; // Set export format
  fileStorage?: any; // File storage for direct JSON export
  setShowShareDialog?: (show: boolean) => void; // Show/hide share dialog
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>; // Share function
}
```

### Command Registration

Commands are registered in a central registry using the `SlashCommand` interface:

```typescript
interface SlashCommand {
  name: string;                    // Command name (without /)
  description: string;             // Human-readable description
  usage: string;                   // Usage example
  requiresConfirmation: boolean;   // Whether to show confirmation dialog
  confirmationMessage?: string;    // Custom confirmation message
  execute: (context: SlashCommandContext) => Promise<SlashCommandResult>;
}
```

### Execution Flow

1. **Input Detection**: User types message starting with `/` in chat
2. **Command Parsing**: `parseSlashCommand()` extracts command name and arguments
3. **Registry Lookup**: System finds command in registry or returns "Unknown Command" error
4. **Confirmation Check**: If required, shows browser confirmation dialog
5. **Context Creation**: Builds execution context with current project state and update functions
6. **Command Execution**: Runs command's `execute()` function with context
7. **Result Display**: Shows success/error message in chat

### Error Handling

The system provides comprehensive error handling:

- **Unknown Commands**: Shows available commands list
- **Execution Errors**: Catches and displays error messages
- **Confirmation Cancellation**: Graceful handling when user cancels destructive operations
- **Context Validation**: Ensures required context functions are available

## Implementation Guide

### Adding New Commands

To add a new client-side slash command:

1. **Define the Command**:
```typescript
const myCommand: SlashCommand = {
  name: 'mycommand',
  description: 'Description of what this command does',
  usage: '/mycommand [args]',
  requiresConfirmation: false, // Set to true for destructive operations
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      // Command implementation here
      // Access current state: context.project
      // Update project: context.updateProject(newProject)
      // Add chat message: context.addMessage('Response text')
      
      return {
        success: true,
        message: '✅ **Success Message**\n\nCommand completed successfully.',
        handled: true
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ **Error Message**\n\nSomething went wrong.',
        handled: true
      };
    }
  }
};
```

2. **Register the Command**:
```typescript
// Add to the commandRegistry Map in clientSlashCommands.ts
const commandRegistry: Map<string, SlashCommand> = new Map([
  ['reset', resetCommand],
  ['import', importCommand],
  ['export', exportCommand],
  ['share', shareCommand],
  ['mycommand', myCommand], // Add your command here
]);
```

3. **Update Context** (if needed):
   - If your command needs additional context functions, add them to the `SlashCommandContext` interface
   - Update the context creation in `RightPanel.tsx`
   - Pass the functions from the parent component (`VibeEditorPage.tsx`)

### Best Practices

1. **Naming**: Use lowercase command names, keep them short and memorable
2. **Descriptions**: Write clear, concise descriptions for help messages
3. **Confirmations**: Always require confirmation for destructive operations
4. **Error Messages**: Provide helpful error messages with suggested alternatives
5. **Success Messages**: Use consistent formatting with emojis and markdown
6. **State Management**: Use the provided context functions instead of direct atom access
7. **Async Operations**: Handle promises properly, especially for file operations

### Testing Commands

To test new commands:

1. **Development**: Start the development server and open the editor
2. **Autocomplete**: Type `/` to verify the command appears in autocomplete dropdown
3. **Chat Interface**: Type your command in the chat interface or select from autocomplete
4. **Verification**: Confirm the command executes correctly and shows appropriate messages
5. **Error Cases**: Test error scenarios (invalid args, confirmation cancellation, etc.)
6. **Integration**: Verify the command works with different project states (local/shared)
7. **Fuzzy Matching**: Test that partial matches like `/rst` correctly suggest `/reset`

## Future Enhancements

The slash command system is designed to be extensible. Potential future commands could include:

- `/help` - Show available commands and usage
- `/export [format]` - Export project in specified format
- `/save` - Save current project
- `/undo` - Undo last action
- `/redo` - Redo last undone action
- `/settings` - Open settings dialog
- `/share` - Share current project

## Technical Notes

### Storage Integration

The system integrates with the dual storage architecture:
- **Local Projects**: Use IndexedDB storage via `clearAllFiles()` atom
- **Shared Projects**: Use memory storage, automatically handled by storage atoms

### Chat Integration

Commands are fully integrated with the chat system:
- User commands appear in chat history
- Command responses use the same message format as AI responses
- Commands don't interfere with AI modes (edit/ask/agent)

### Performance

Client-side execution ensures:
- No network latency
- No API usage costs
- Immediate user feedback
- Offline functionality
- Fast autocomplete with fuzzy matching
- Responsive keyboard navigation

### Autocomplete Implementation

The autocomplete system includes:
- **Fuzzy matching algorithm** that scores commands based on character matches
- **Real-time filtering** that updates results as the user types
- **Keyboard navigation** with arrow keys and enter selection
- **Visual highlighting** of matching characters for better UX
- **Click-to-select** functionality for mouse users
- **Automatic positioning** above input to avoid layout issues

This architecture provides a solid foundation for expanding the command system while maintaining consistency, reliability, and excellent user experience.