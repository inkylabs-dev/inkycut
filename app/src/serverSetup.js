import express from 'express';
import cors from 'cors';

import { config } from 'wasp/server'

console.log(config.frontendUrl)

export const serverMiddlewareFn = (middlewareConfig) => {
  middlewareConfig.set('cors', cors({
	  origin: [config.frontendUrl, 'https://inkycut.com', 'https://www.inkycut.com', 'https://inkycut-client.fly.dev'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
  middlewareConfig.set('express.json', express.json({ limit: '50mb' }));
  return middlewareConfig
}
