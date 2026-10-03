import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/rateLimiter';
import { prisma } from './database/prisma';

export const app = express();
app.set("trust proxy", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LUMO API Server', version: '1.0' });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 LUMO API Server running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log("   Database: configured");
    console.log(`====================================================`);
  });
}
