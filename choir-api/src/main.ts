import express from 'express';
import * as path from 'path';
import authRoutes from './modules/auth/auth.routes';
import songsRoutes from './modules/songs/songs.routes';
import uniformsRoutes from './modules/uniforms/uniforms.routes';

const app = express();
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/songs', songsRoutes);
app.use('/api/v1/uniforms', uniformsRoutes);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to choir-api!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
