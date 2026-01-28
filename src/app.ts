import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { clerkMiddleware } from './config/clerk.js';
import { apiRouter } from './routes/chat-app/index.js';
import { env } from './config/env.js';

const require = createRequire(import.meta.url);
const helmet = require('helmet');

import http from 'node:http';
import { initIo } from './realtime/io.js';
import portfolioRouter from './routes/portfolio/index.js';

const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, env.PORTFOLIO_FRONTEND_URL, 'http://localhost:5173'],
    credentials: true
  })
);

app.use(clerkMiddleware());

app.use(helmet());

app.use(express.json());

//health check
app.get('/health', (_req, res) => {
  res.json({ message: 'healthy' });
});

app.use('/chat-app/api', apiRouter);
app.use('/portfolio', portfolioRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
initIo(server);

export default server;
