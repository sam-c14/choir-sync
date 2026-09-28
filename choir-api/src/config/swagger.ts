import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CSync (ChoirSync) API',
      version: '1.0.0',
      description: 'Choir management backend API for rosters, songs, and audio snippets.',
    },
    servers: [
      { url: 'http://localhost:4200', description: 'Local Server' },
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
      { name: 'System', description: 'Health check and monitoring' }
    ]
  },
  apis: ['./src/modules/**/*.ts', './src/main.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
