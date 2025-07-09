import express from 'express';
import type { Request, Response } from 'express';
import { renderTasks } from './operations';

// Create SSE middleware
export const renderProgressSSE = (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  if (!taskId) {
    return res.status(400).send('Task ID is required');
  }
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send an initial message
  res.write(`data: ${JSON.stringify({ message: 'Connected to SSE endpoint' })}\n\n`);
  
  // Create a function to send progress updates
  const sendUpdate = () => {
    const task = renderTasks.get(taskId);
    
    if (!task) {
      res.write(`data: ${JSON.stringify({ error: 'Task not found' })}\n\n`);
      res.end();
      return;
    }
    
    // Send task progress
    res.write(`data: ${JSON.stringify({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      videoUrl: task.videoUrl,
      error: task.error,
      updatedAt: task.updatedAt
    })}\n\n`);
    
    // If task is completed or failed, end the connection
    if (task.status === 'completed' || task.status === 'failed') {
      res.end();
    }
  };
  
  // Send updates every second
  const interval = setInterval(sendUpdate, 1000);
  
  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(interval);
  });
};
