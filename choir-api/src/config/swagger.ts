import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerPaths } from './swagger-paths';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CSync (ChoirSync) API',
      version: '1.0.0',
      description: 'Choir management backend API for rosters, songs, and audio snippets.',
    },
    servers: [
      { url: 'http://localhost:3333', description: 'Local Server' },
      { url: 'https://choir-sync.onrender.com', description: 'Production Server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'System', description: 'Health check and monitoring' },
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Songs', description: 'Core library and part assignments' },
      { name: 'Voice Snippets', description: 'Audio rehearsals and uploads' },
      { name: 'Playlists', description: 'Sunday lineups and arrangements' },
      { name: 'Roster & Notifications', description: 'Scheduling and alerts' },
      { name: 'Uniforms', description: 'Dress code configurations' },
      { name: 'AI Curator', description: 'Gemini-powered setlist suggestions' },
      { name: 'Users', description: 'Member management' },
      { name: 'External Music', description: 'External song discovery' }
    ],
    paths: swaggerPaths,
  },
  apis: ['./src/modules/**/*.ts', './src/main.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
