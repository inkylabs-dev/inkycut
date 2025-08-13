#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { renderFromUrl, renderFromFile } from './render';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get absolute path to the bundle directory
// When running from source: __dirname = /path/to/app/src/packages/render
// When running from build: __dirname = /path/to/app/.wasp/build/src/packages/render or .wasp/build/sdk/wasp/dist/src/packages/render
let bundlePath: string;
if (__dirname.includes('.wasp/build')) {
  // Running from built version - bundle should be at same level
  if (__dirname.includes('/sdk/')) {
    // Running from SDK build
    bundlePath = resolve(__dirname, '../../../../../src/packages/render/bundle/');
  } else {
    // Running from regular build
    bundlePath = resolve(__dirname, './bundle/');
  }
} else {
  // Running from source - need to find the built bundle
  bundlePath = resolve(__dirname, '../../../.wasp/build/src/packages/render/bundle/');
}

async function createTempDirectoryStructure(verbose?: boolean): Promise<string> {
  if (verbose) {
    console.log(chalk.gray('Creating temporary directory structure...'));
    console.log(chalk.gray(`CLI running from: ${__dirname}`));
    console.log(chalk.gray(`Looking for bundle at: ${bundlePath}`));
  }

  // Create a temporary directory
  const tempDir = await fs.mkdtemp(resolve(os.tmpdir(), 'inkycut-render-'));
  
  if (verbose) {
    console.log(chalk.gray(`Temp directory: ${tempDir}`));
  }

  // Copy bundle files to temp directory
  if (existsSync(bundlePath)) {
    if (verbose) {
      console.log(chalk.gray(`Copying bundle from: ${bundlePath}`));
    }
    await copyDirectory(bundlePath, tempDir);
  } else {
    throw new Error(`Bundle directory not found: ${bundlePath}`);
  }

  // Create public directory in temp directory
  const publicDir = resolve(tempDir, 'public');
  await fs.mkdir(publicDir, { recursive: true });
  
  if (verbose) {
    console.log(chalk.gray(`Created public directory: ${publicDir}`));
  }

  return tempDir;
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  await fs.mkdir(dest, { recursive: true });
  
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

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
      
      if (options.verbose) {
        console.log(chalk.gray('Verbose logging enabled'));
      }
      
      // Create temp directory with bundle and public structure
      const tempDir = await createTempDirectoryStructure(options.verbose);
      
      const renderOptions = {
        output: options.output,
        quality: options.quality,
        format: options.format,
        tempDir: tempDir,
        verbose: options.verbose
      };
      
      try {
        if (isUrl) {
          await renderFromUrl(options.input, renderOptions);
        } else {
          await renderFromFile(options.input, renderOptions);
        }
        
        console.log(chalk.green('✅ Rendering completed successfully!'));
      } finally {
        // Clean up temp directory
        if (options.verbose) {
          console.log(chalk.gray(`Cleaning up temp directory: ${tempDir}`));
        }
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
program.parse(process.argv);
