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
import searchRoutes from './modules/search/search.routes';
import { prisma } from "./lib/prisma";
import playlistsRoutes from './modules/playlists/playlists.routes';
import songPartsRoutes from './modules/snippets/song-parts.routes';
import snippetsRoutes from './modules/snippets/snippets.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
app.disable('x-powered-by');

// Security Headers middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Use morgan for HTTP request logging. Pipe its output to winston info level.
const stream = {
  write: (message: string) => logger.info(message.trim()),
};
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }));

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => Boolean(o) && o !== '*');

const allowedOrigins = [
  ...configuredOrigins,
  'https://choir-sync.vercel.app',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:4200',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Allow local development ports for web and emulators
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // Allow Vercel preview environments for choir-sync
  if (/^https:\/\/choir-sync[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like native mobile apps, Capacitor native HTTP, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', apiLimiter);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/songs', songsRoutes);
app.use('/api/v1/uniforms', uniformsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/external-music', externalMusicRoutes);
app.use('/api/v1/playlists', playlistsRoutes);
app.use('/api/v1/search', searchRoutes);

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

const isSwaggerEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';

if (isSwaggerEnabled) {
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "CSync API Docs", explorer: true }));
} else {
  app.use(['/api/docs', '/api/docs.json'], (req, res) => {
    res.status(404).json({ error: 'API documentation is disabled in production' });
  });
}
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
