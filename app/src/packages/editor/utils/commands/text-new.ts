/**
 * new-text command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const newTextCommand: SlashCommand = {
  name: 'new-text',
  description: 'Add a new text element to the selected page',
  usage: '/new-text [--text|-t "text"] [--font-size|-fs size] [--color|-c color] [--font-family|-ff family] [--font-weight|-fw weight] [--text-align|-ta align] [--left|-l x] [--top|-tp y] [--width|-w width]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project || !context.project.composition) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
          handled: true
        };
      }

      const args = context.args || [];
      
      // Default text element properties
      const elementData: any = {
        type: 'text',
        text: 'New Text',
        left: 100,
        top: 100,
        width: 200,
        fontSize: 32,
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        textAlign: 'left'
      };

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--text':
          case '-t':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--text` requires a value.\n\nExample: `--text "Hello World"`',
                handled: true
              };
            }
            elementData.text = nextArg;
            i++; // Skip next arg
            break;

          case '--font-size':
          case '-fs':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-size` requires a value.\n\nExample: `--font-size 24`',
                handled: true
              };
            }
            const fontSize = parseInt(nextArg, 10);
            if (isNaN(fontSize) || fontSize <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Font Size**\n\nFont size must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.fontSize = fontSize;
            i++; // Skip next arg
            break;

          case '--color':
          case '-c':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--color` requires a value.\n\nExamples: `--color "#ff0000"`, `--color "red"`, `--color "rgb(255,0,0)"`',
                handled: true
              };
            }
            elementData.color = nextArg;
            i++; // Skip next arg
            break;

          case '--font-family':
          case '-ff':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-family` requires a value.\n\nExample: `--font-family "Arial, sans-serif"`',
                handled: true
              };
            }
            elementData.fontFamily = nextArg;
            i++; // Skip next arg
            break;

          case '--font-weight':
          case '-fw':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-weight` requires a value.\n\nExamples: `--font-weight "bold"`, `--font-weight "normal"`, `--font-weight "600"`',
                handled: true
              };
            }
            elementData.fontWeight = nextArg;
            i++; // Skip next arg
            break;

          case '--text-align':
          case '-ta':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--text-align` requires a value.\n\nValid values: `left`, `center`, `right`',
                handled: true
              };
            }
            if (!['left', 'center', 'right'].includes(nextArg)) {
              return {
                success: false,
                message: `❌ **Invalid Text Align**\n\nText align must be 'left', 'center', or 'right'. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.textAlign = nextArg;
            i++; // Skip next arg
            break;

          case '--left':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                handled: true
              };
            }
            const left = parseInt(nextArg, 10);
            if (isNaN(left)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.left = left;
            i++; // Skip next arg
            break;

          case '--top':
          case '-tp':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                handled: true
              };
            }
            const top = parseInt(nextArg, 10);
            if (isNaN(top)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.top = top;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.width = width;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-text without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Get selected page
      const selectedPageId = context.project.appState?.selectedPageId;
      if (!selectedPageId) {
        return {
          success: false,
          message: '❌ **No Page Selected**\n\nPlease select a page first before adding elements.',
          handled: true
        };
      }

      // Find the selected page
      const pages = [...context.project.composition.pages];
      const selectedPage = pages.find(page => page.id === selectedPageId);
      if (!selectedPage) {
        return {
          success: false,
          message: '❌ **Page Not Found**\n\nThe selected page could not be found.',
          handled: true
        };
      }

      // Create new element with unique ID
      const newElement = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...elementData
      };

      // Add element to page
      selectedPage.elements.push(newElement);

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Text Element Added**\n\nAdded text element "${elementData.text}" to page "${selectedPage.name}"\n\n• Position: (${elementData.left}, ${elementData.top})\n• Width: ${elementData.width}px (height auto-calculated)\n• Font: ${elementData.fontSize}px ${elementData.fontFamily}\n• Color: ${elementData.color}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create text element:', error);
      return {
        success: false,
        message: '❌ **Text Creation Failed**\n\nFailed to create text element. Please try again.',
        handled: true
      };
    }
  }
};;
