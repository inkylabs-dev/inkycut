#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { renderFromUrl } from './render';
import { version } from '../package.json';

const program = new Command();

program
  .name('inkycut-render')
  .description('CLI for rendering InkyCut video projects')
  .version(version);

program
  .argument('<url>', 'InkyCut share URL (e.g., https://inkycut.com/vibe#share=xxxxxxxx)')
  .option('-o, --output <path>', 'Output file path', './output.mp4')
  .option('-q, --quality <quality>', 'Video quality (1080p, 720p, 480p)', '1080p')
  .option('-f, --format <format>', 'Output format (mp4, webm)', 'mp4')
  .option('--verbose', 'Enable verbose logging')
  .action(async (url, options) => {
    try {
      console.log(chalk.blue('🎬 InkyCut Render CLI'));
      console.log(chalk.gray(`URL: ${url}`));
      console.log(chalk.gray(`Output: ${options.output}`));
      console.log(chalk.gray(`Quality: ${options.quality}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      
      if (options.verbose) {
        console.log(chalk.gray('Verbose logging enabled'));
      }
      
      await renderFromUrl(url, {
        output: options.output,
        quality: options.quality,
        format: options.format,
        verbose: options.verbose
      });
      
      console.log(chalk.green('✅ Rendering completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();