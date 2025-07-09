import type { User } from 'wasp/entities';
import type {
  CreateVibeProject,
  UpdateVibeProject,
  GetVibeProject,
  GetUserVibeProjects,
} from 'wasp/server/operations';

// In-memory storage for demo purposes
const vibeProjects: Map<string, any> = new Map();
// In-memory storage for render tasks - exported for SSE endpoint
export const renderTasks: Map<string, any> = new Map();

export const createVibeProject: CreateVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const projectId = typedArgs.id || Math.random().toString(36).substring(7);
  const newProject = {
    id: projectId,
    name: typedArgs.name || 'Untitled Project',
    userId: context.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [],
    assets: [],
    composition: null,
    // Server-side control for properties editing, default to false
    propertiesEnabled: typedArgs.propertiesEnabled !== undefined ? typedArgs.propertiesEnabled : false
  };
  
  vibeProjects.set(projectId, newProject);
  return newProject;
};

export const updateVibeProject: UpdateVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const project = vibeProjects.get(typedArgs.id);
  if (!project || project.userId !== context.user.id) {
    throw new Error('Project not found or access denied');
  }
  
  const updatedProject = {
    ...project,
    ...(typedArgs.name && { name: typedArgs.name }),
    ...(typedArgs.timeline && { timeline: typedArgs.timeline }),
    ...(typedArgs.assets && { assets: typedArgs.assets }),
    ...(typedArgs.composition && { composition: typedArgs.composition }),
    ...(typedArgs.propertiesEnabled !== undefined && { propertiesEnabled: typedArgs.propertiesEnabled }),
    updatedAt: new Date().toISOString()
  };
  
  vibeProjects.set(typedArgs.id, updatedProject);
  return updatedProject;
};

export const getVibeProject: GetVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const project = vibeProjects.get(typedArgs.id);
  if (!project) {
    return null;
  }
  
  if (project.userId !== context.user.id) {
    throw new Error('Access denied');
  }
  
  return project;
};

export const getUserVibeProjects: GetUserVibeProjects = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const userProjects = Array.from(vibeProjects.values())
    .filter(project => project.userId === context.user!.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  return userProjects;
};

// Add a function to get task progress
export const getTaskProgress = async (
  args: { taskId: string },
  context: { user?: User }
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { taskId } = args;
  const task = renderTasks.get(taskId);
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  if (task.userId !== context.user.id) {
    throw new Error('Access denied');
  }
  
  return {
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    videoUrl: task.videoUrl,
    error: task.error,
    updatedAt: task.updatedAt
  };
};

// Add a function to render the project
export const renderVibeProject = async (
  args,
  context
) => {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const typedArgs = args as any;
  const projectId = typedArgs.projectId;
  const projectData = typedArgs.projectData;
  
  if (!projectId || !projectData) {
    throw new Error('Missing project ID or project data');
  }
  
  const project = vibeProjects.get(projectId);
  if (!project || project.userId !== context.user.id) {
    throw new Error('Project not found or access denied');
  }
  
  // Generate a unique task ID
  const taskId = `task_${Math.random().toString(36).substring(2, 15)}`;
  
  // Create a new render task
  const renderTask = {
    id: taskId,
    projectId,
    userId: context.user.id,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    videoUrl: null,
    error: null
  };
  
  // Store the task
  renderTasks.set(taskId, renderTask);
  
  // Start the rendering simulation process
  simulateRendering(taskId, projectData);
  
  return { taskId };
};

// Simulate video rendering process
function simulateRendering(taskId: string, projectData: any) {
  const totalSteps = 10;
  let currentStep = 0;
  
  const updateProgress = () => {
    currentStep++;
    const progress = Math.round((currentStep / totalSteps) * 100);
    
    const task = renderTasks.get(taskId);
    if (task) {
      task.status = currentStep < totalSteps ? 'processing' : 'completed';
      task.progress = progress;
      task.updatedAt = new Date().toISOString();
      
      if (currentStep === totalSteps) {
        // Generate a fake video URL when complete
        task.videoUrl = `https://example.com/videos/${taskId}.mp4`;
      }
      
      renderTasks.set(taskId, task);
    }
    
    if (currentStep < totalSteps) {
      setTimeout(updateProgress, 1000); // Update every second
    }
  };
  
  // Start the simulation
  setTimeout(updateProgress, 1000);
}
