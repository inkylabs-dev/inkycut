/**
 * zoom-tl command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const zoomTimelineCommand: SlashCommand = {
  name: 'zoom-tl',
  description: 'Set timeline zoom level to specified percentage',
  usage: '/zoom-tl <percentage>',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
          handled: true
        };
      }

      const args = context.args || [];
      
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ **Missing Parameter**\n\nPlease specify a zoom percentage. Usage: `/zoom-tl <percentage>`\n\nExample: `/zoom-tl 50%` or `/zoom-tl 150`',
          handled: true
        };
      }

      // Parse percentage parameter
      let percentageStr = args[0];
      let percentage: number;

      // Handle both "50%" and "50" formats
      if (percentageStr.endsWith('%')) {
        percentage = parseFloat(percentageStr.slice(0, -1));
      } else {
        percentage = parseFloat(percentageStr);
      }

      // Validate percentage
      if (isNaN(percentage) || percentage <= 0) {
        return {
          success: false,
          message: `❌ **Invalid Percentage**\n\nInvalid percentage value '${args[0]}'. Please provide a positive number.\n\nExample: \`/zoom-tl 50%\` or \`/zoom-tl 150\``,
          handled: true
        };
      }

      // Clamp percentage to reasonable bounds (10% to 1000%)
      const clampedPercentage = Math.max(10, Math.min(1000, percentage));
      const zoomLevel = clampedPercentage / 100;

      // Update project with new zoom level
      const updatedProject = {
        ...context.project,
        appState: {
          ...context.project.appState,
          zoomLevel: zoomLevel
        }
      };

      context.updateProject(updatedProject);

      // Show success message
      const actualPercentage = Math.round(clampedPercentage);
      let message = `🔍 **Timeline Zoom Updated**\n\nTimeline zoom set to ${actualPercentage}%.`;
      
      if (clampedPercentage !== percentage) {
        message += `\n\n⚠️ *Zoom level was clamped from ${percentage}% to ${actualPercentage}% (valid range: 10%-1000%)*`;
      }

      return {
        success: true,
        message,
        handled: true
      };
    } catch (error) {
      console.error('Failed to set timeline zoom:', error);
      return {
        success: false,
        message: '❌ **Zoom Failed**\n\nFailed to set timeline zoom level. Please try again.',
        handled: true
      };
    }
  }
};;
