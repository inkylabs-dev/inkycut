import type { User } from 'wasp/entities';
import type {
  CreateVibeProject,
  UpdateVibeProject,
  GetVibeProject,
  GetUserVibeProjects,
} from 'wasp/server/operations';

// In-memory storage for demo purposes
const vibeProjects: Map<string, any> = new Map();

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
    composition: null
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
