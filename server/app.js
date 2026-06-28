import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config/index.js';
import { initializeFirebase } from './services/firebase/index.js';
import { errorHandler } from './middleware/index.js';
import { inMemoryStore } from './utils/inMemoryStore.js';

import authRoutes from './routes/authRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

validateConfig();
initializeFirebase();
inMemoryStore.seed();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Community Hero API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Community Hero API running on http://localhost:${config.port}`);
});

export default app;
