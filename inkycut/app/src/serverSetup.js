import express from 'express';
import cors from 'cors';

export const serverMiddlewareFn = (middlewareConfig) => {
  middlewareConfig.set('cors', cors({
    origin: ['https://inkycut.com', 'https://www.inkycut.com', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
  middlewareConfig.set('express.json', express.json({ limit: '50mb' }));
  return middlewareConfig
}
