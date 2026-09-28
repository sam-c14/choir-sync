import express from 'express';
import * as path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import { logger } from './lib/logger';
import authRoutes from './modules/auth/auth.routes';
import songsRoutes from './modules/songs/songs.routes';
import uniformsRoutes from './modules/uniforms/uniforms.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import aiRoutes from './modules/ai/ai.routes';
import usersRoutes from './modules/users/users.routes';
import externalMusicRoutes from './modules/external-music/external-music.routes';
import { prisma } from "./lib/prisma";
import playlistsRoutes from './modules/playlists/playlists.routes';
import songPartsRoutes from './modules/snippets/song-parts.routes';
import snippetsRoutes from './modules/snippets/snippets.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

// Use morgan for HTTP request logging. Pipe its output to winston info level.
const stream = {
  write: (message: string) => logger.info(message.trim()),
};
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/songs', songsRoutes);
app.use('/api/v1/uniforms', uniformsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/external-music', externalMusicRoutes);
app.use('/api/v1/playlists', playlistsRoutes);

app.get('/api/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const isStrict = req.query.strict === 'true';
    res.status(isStrict ? 503 : 200).json({
      status: 'ok',
      db: 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "CSync API Docs", explorer: true }));
app.use('/api/v1/song-parts', songPartsRoutes);
app.use('/api/v1/snippets', snippetsRoutes);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to choir-api!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  logger.info(`Listening at http://localhost:${port}/api`);
});
server.on('error', (err) => logger.error(err));
