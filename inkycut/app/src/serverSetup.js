import express from 'express';

export const serverMiddlewareFn = (middlewareConfig) => {
  // Example of adding extra domains to CORS.
  middlewareConfig.set('express.json', express.json({ limit: '50mb' }));
  return middlewareConfig
}