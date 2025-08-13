import { URL } from 'url';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { renderMedia, selectComposition } from '@remotion/renderer';
import http from 'http';
import { createReadStream, existsSync } from 'fs';
// Use a simple mime type lookup to avoid external dependency
const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

export interface RenderOptions {
  output: string;
  quality: string;
  format: string;
  tempDir: string;
  verbose?: boolean;
}

export async function renderFromUrl(shareUrl: string, options: RenderOptions): Promise<void> {
  // Parse the share URL to extract the share ID
  const shareId = extractShareId(shareUrl);
  if (!shareId) {
    throw new Error('Invalid share URL format. Expected format: https://inkycut.com/vibe#share=xxxxxxxx');
  }

  if (options.verbose) {
    console.log(chalk.gray(`Extracted share ID: ${shareId}`));
  }

  // Fetch the project data from the share ID
  const projectData = await fetchProjectData(shareUrl, shareId, options.verbose);

  // Process the project data for rendering and dump files to public directory
  const processedProject = await processProjectData(projectData, options.tempDir, options.verbose);

  // Render the video
  await renderVideo(processedProject, options);
}

export async function renderFromFile(filePath: string, options: RenderOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.gray(`Reading project file: ${filePath}`));
  }

  // Read and parse the JSON file
  const projectData = await readProjectFile(filePath, options.verbose);

  // Process the project data for rendering and dump files to public directory
  const processedProject = await processProjectData(projectData, options.tempDir, options.verbose);

  // Render the video
  await renderVideo(processedProject, options);
}

async function readProjectFile(filePath: string, verbose?: boolean): Promise<any> {
  try {
    // Check if file exists and is accessible
    await fs.access(filePath);
    
    if (verbose) {
      console.log(chalk.gray('Reading project file...'));
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const projectData = JSON.parse(fileContent);
    
    if (verbose) {
      console.log(chalk.gray('Project file read successfully'));
    }
    
    return projectData;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Project file not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in project file: ${filePath}`);
    }
    throw new Error(`Failed to read project file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractShareId(shareUrl: string): string | null {
  try {
    const url = new URL(shareUrl);
    const hash = url.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);
    return params.get('share');
  } catch (error) {
    return null;
  }
}

async function fetchProjectData(shareUrl: string, _shareId: string, verbose?: boolean): Promise<any> {
  if (verbose) {
    console.log(chalk.gray('Fetching project data...'));
  }

  // Try to fetch from the API endpoint
  try {
    const apiUrl = shareUrl.replace('#share=', '/api/share/');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (verbose) {
      console.log(chalk.gray('Project data fetched successfully'));
    }
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch project data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processProjectData(projectData: any, tempDir: string, verbose?: boolean): Promise<any> {
  if (verbose) {
    console.log(chalk.gray('Processing project data...'));
    console.log(chalk.gray(`Project has ${projectData.files ? projectData.files.length : 'no'} files`));
  }

  // Process the project to dump files to public directory and update references
  const processedProject = await dumpFilesToPublicDir(projectData, tempDir, verbose);

  if (verbose) {
    console.log(chalk.gray('Project data processed'));
  }

  return processedProject;
}

async function dumpFilesToPublicDir(project: any, tempDir: string, verbose?: boolean): Promise<any> {
  const processedProject = JSON.parse(JSON.stringify(project));
  
  if (!processedProject.files || processedProject.files.length === 0) {
    if (verbose) {
      console.log(chalk.gray('No files found in project to dump'));
    }
    return processedProject;
  }
  
  if (verbose) {
    console.log(chalk.gray(`Found ${processedProject.files.length} files to dump to public directory`));
  }
  
  const publicDir = path.join(tempDir, 'public');
  const fileMap = new Map();
  
  // Dump files to public directory as binary data
  for (const file of processedProject.files) {
    if (file.name && file.dataUrl) {
      try {
        // Extract binary data from data URL
        const [, base64Data] = file.dataUrl.split(',');
        if (!base64Data) {
          if (verbose) {
            console.log(chalk.yellow(`Warning: Invalid data URL for file ${file.name}`));
          }
          continue;
        }
        
        // Convert base64 to binary
        const binaryData = Buffer.from(base64Data, 'base64');
        
        // Use original filename or generate one based on file ID
        const filename = file.name;
        const filepath = path.join(publicDir, filename);
        
        // Write binary file to public directory
        await fs.writeFile(filepath, binaryData);
        
        // Map filename to public URL
        const publicUrl = `/public/${filename}`;
        fileMap.set(file.name, publicUrl);
        fileMap.set(file.id, publicUrl);
        
        if (verbose) {
          console.log(chalk.gray(`Dumped file: ${file.name} -> ${publicUrl} (${binaryData.length} bytes)`));
        }
      } catch (error) {
        if (verbose) {
          console.error(chalk.red(`Failed to dump file ${file.name}:`), error);
        }
      }
    }
  }
  
  // Process audios at composition level
  if (processedProject.composition?.audios) {
    for (const audio of processedProject.composition.audios) {
      if (audio.src && fileMap.has(audio.src)) {
        const originalSrc = audio.src;
        audio.src = fileMap.get(audio.src);
        if (verbose) {
          console.log(chalk.gray(`Updated audio reference: ${originalSrc} -> ${audio.src}`));
        }
      }
    }
  }
  
  // Process media elements in pages
  const pages = processedProject.composition?.pages || processedProject.pages;
  if (pages) {
    for (const page of pages) {
      if (page.elements) {
        for (const element of page.elements) {
          if ((element.type === 'image' || element.type === 'video') && element.src) {
            if (fileMap.has(element.src)) {
              const originalSrc = element.src;
              element.src = fileMap.get(element.src);
              if (verbose) {
                console.log(chalk.gray(`Updated element reference: ${originalSrc} -> ${element.src}`));
              }
            } else if (!element.src.startsWith('http://') && !element.src.startsWith('https://')) {
              if (verbose) {
                console.log(chalk.yellow(`Warning: File reference not found: ${element.src}`));
              }
            }
          }
        }
      }
    }
  }
  
  return processedProject;
}

async function startLocalServer(tempDir: string, verbose?: boolean): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      let filePath = path.join(tempDir, url === '/' ? 'index.html' : url);
      
      // Handle public directory requests
      if (url.startsWith('/public/')) {
        filePath = path.join(tempDir, url);
      }
      
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      
      const mimeType = getMimeType(filePath);
      res.writeHead(200, { 'Content-Type': mimeType });
      
      const stream = createReadStream(filePath);
      stream.pipe(res);
      
      stream.on('error', (error) => {
        if (verbose) {
          console.error(chalk.red('File stream error:'), error);
        }
        res.writeHead(500);
        res.end('Internal Server Error');
      });
    });
    
    server.listen(0, 'localhost', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      
      const url = `http://localhost:${address.port}`;
      if (verbose) {
        console.log(chalk.gray(`Local server started at: ${url}`));
      }
      
      resolve({ server, url });
    });
    
    server.on('error', reject);
  });
}

export async function renderVideo(projectData: any, options: RenderOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.gray('Starting video rendering...'));
  }

  // Start local HTTP server to serve the bundle
  const { server, url: bundleUrl } = await startLocalServer(options.tempDir, options.verbose);
  
  // Set up the input props to match MainComposition structure
  const inputProps = {
    data: projectData.composition,
    files: projectData.files || [],
  };

  if (options.verbose) {
    console.log(chalk.gray('Selecting composition...'));
  }
  
  // Select the composition using the correct ID
  const composition = await selectComposition({
    serveUrl: bundleUrl,
    id: 'MainComposition', // Match the ID from entrypoint
    inputProps,
  });
  
  if (options.verbose) {
    console.log(chalk.gray('Rendering...'));
  }
  
  try {
    // Track rendering start time for progress estimation
    const startTime = Date.now();
    
    // Render using Remotion with the selected composition
    await renderMedia({
      composition,
      serveUrl: bundleUrl,
      codec: options.format === 'webm' ? 'vp9' : 'h264',
      outputLocation: options.output,
      inputProps,
      imageFormat: 'jpeg',
      pixelFormat: 'yuv420p',
      overwrite: true,
      timeoutInMilliseconds: 300000, // 5 minutes timeout
      onProgress: ({progress}) => {
        if (options.verbose && typeof progress === 'number') {
          const percentage = Math.round(progress * 100);
          const barLength = 20;
          const filledLength = Math.round((percentage / 100) * barLength);
          const emptyLength = barLength - filledLength;
          const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
          
          // Calculate time estimates
          const elapsed = Date.now() - startTime;
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const estimatedTotal = progress > 0 ? Math.floor(elapsed / progress) : 0;
          const estimatedTotalSeconds = Math.floor(estimatedTotal / 1000);
          const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);
          
          const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          process.stdout.write(`\r${chalk.blue('Rendering:')} [${progressBar}] ${percentage}% Left ${formatTime(remainingSeconds)} / Total ${formatTime(estimatedTotalSeconds)}`);
        }
      },
    });
    
    if (options.verbose) {
      console.log('\n' + chalk.gray('Video rendered successfully'));
    }
  } finally {
    // Clean up the local server
    server.close();
    if (options.verbose) {
      console.log(chalk.gray('Local server stopped'));
    }
  }
}


