#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { renderFromUrl, renderFromFile } from './render';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get absolute path to the bundle directory
const defaultBundlePath = resolve(__dirname, './bundle/');

const program = new Command();

program
  .name('inkycut-render')
  .description('CLI for rendering InkyCut video projects')
  .version('0.1.0')
  //.argument('<input>', 'InkyCut share URL (e.g., https://inkycut.com/vibe#share=xxxxxxxx) or local JSON file path')
  .option('-i, --input <path>', 'Input file path (if not using URL)', './input.json')
  .option('-o, --output <path>', 'Output file path', './output.mp4')
  .option('-q, --quality <quality>', 'Video quality (1080p, 720p, 480p)', '1080p')
  .option('-f, --format <format>', 'Output format (mp4, webm)', 'mp4')
  .option('-b, --bundle <url>', 'Remotion bundle URL', defaultBundlePath)
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🎬 InkyCut Render CLI'));
      
      // Determine if input is a URL or file path
      const isUrl = options.input.startsWith('http://') || options.input.startsWith('https://');
      const isFile = !isUrl && existsSync(options.input);

      if (!isUrl && !isFile) {
        throw new Error(`Input must be either a valid URL or an existing file path. Got: ${options.input}`);
      }
      
      console.log(chalk.gray(`Input: ${options.input} ${isUrl ? '(URL)' : '(file)'}`));
      console.log(chalk.gray(`Output: ${options.output}`));
      console.log(chalk.gray(`Quality: ${options.quality}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      console.log(chalk.gray(`Bundle: ${options.bundle}`));
      
      if (options.verbose) {
        console.log(chalk.gray('Verbose logging enabled'));
      }
      
      const renderOptions = {
        output: options.output,
        quality: options.quality,
        format: options.format,
        bundle: options.bundle,
        verbose: options.verbose
      };
      
      if (isUrl) {
        await renderFromUrl(options.input, renderOptions);
      } else {
        await renderFromFile(options.input, renderOptions);
      }
      
      console.log(chalk.green('✅ Rendering completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
program.parse(process.argv);
