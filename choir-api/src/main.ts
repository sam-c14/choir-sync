import express from 'express';
import * as path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import { logger } from './lib/logger';
import authRoutes from './modules/auth/auth.routes';
import songsRoutes from './modules/songs/songs.routes';
import uniformsRoutes from './modules/uniforms/uniforms.routes';
import usersRoutes from './modules/users/users.routes';
import externalMusicRoutes from './modules/external-music/external-music.routes';

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
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/external-music', externalMusicRoutes);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to choir-api!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  logger.info(`Listening at http://localhost:${port}/api`);
});
server.on('error', (err) => logger.error(err));
