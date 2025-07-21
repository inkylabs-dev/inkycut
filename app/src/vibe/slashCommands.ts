import type { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';

/**
 * Process slash commands for special functionality
 * 
 * @param command The slash command to process (without the leading slash)
 * @param project The project data to use for processing
 * @param user The user who initiated the command
 * @returns Response object with message and any additional data
 */
export async function processSlashCommand(command: string, project: any) {
  // Parse the command and args
  const [mainCommand, ...args] = command.trim().split(/\s+/);
  
  // Convert args like "--type mp4" to an object like {type: "mp4"}
  const argsObj = args.reduce((acc, curr, idx, arr) => {
    if (curr.startsWith('--') && idx + 1 < arr.length && !arr[idx + 1].startsWith('--')) {
      const key = curr.substring(2);
      acc[key] = arr[idx + 1];
    }
    return acc;
  }, {} as Record<string, string>);

  console.log(`Processing slash command: /${mainCommand}`, argsObj);
  
  // Handle different commands
  switch (mainCommand.toLowerCase()) {
    case 'help': {
      return {
        message: `/help - Show this help message`,
        status: 'complete',
      };
    }
    
    default:
      throw new HttpError(400, `Unknown command: /${mainCommand}`);
  }
}
