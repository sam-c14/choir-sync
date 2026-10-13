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
import { sendError, handleControllerError } from './lib/errors';
import { seoBotProxy } from './middleware/seo-bot-proxy';

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

// Custom Morgan token: stamps every HTTP log line with the authenticated user (set by requireAuth).
// Falls back to 'anonymous' for unauthenticated routes (e.g. /auth/login, /auth/google).
morgan.token('user', (req: express.Request) => {
  if (req.user?.email) return req.user.email;
  if (req.user?.id) return `uid:${req.user.id}`;
  return 'anonymous';
});

// Use morgan for HTTP request logging. Pipe its output to winston info level.
const stream = {
  write: (message: string) => logger.info(message.trim()),
};
// Production: combined format + user identity; dev: compact dev format + user
const morganFormat = process.env.NODE_ENV === 'production'
  ? 'combined :user'
  : ':method :url :status :response-time ms - :user';
app.use(morgan(morganFormat, { stream }));


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
    return sendError(res, 404, 'API documentation is disabled in production', undefined, 'NOT_FOUND');
  });
}
app.use('/api/v1/song-parts', songPartsRoutes);
app.use('/api/v1/snippets', snippetsRoutes);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to choir-api!' });
});

// SEO Bot Proxy: intercept known social-media crawlers on dynamic routes
// and serve server-rendered HTML with page-specific Open Graph tags.
// Must be mounted before the 404 catch-all so bots get a 200 response.
app.use(seoBotProxy);

// 404 handler for unmapped routes
app.use((req, res) => {
  sendError(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`, undefined, 'NOT_FOUND');
});

// Global unhandled error handler middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const user = req.user?.email ?? req.user?.id ?? 'anonymous';
  logger.error({
    message: 'Unhandled API Error',
    user,
    method: req.method,
    path: req.originalUrl,
    errorMessage: err?.message ?? String(err),
    stack: err?.stack,
    errorCode: err?.code,
  });
  handleControllerError(res, err, 'An unexpected server error occurred');
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  logger.info(`Listening at http://localhost:${port}/api`);
});
server.on('error', (err) => logger.error(err));
