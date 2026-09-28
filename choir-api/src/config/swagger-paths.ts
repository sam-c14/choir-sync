export const swaggerPaths = {
  '/api/v1/auth/google': {
    post: {
      tags: ['Auth'],
      summary: 'Login via Google',
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { idToken: { type: 'string' } } } } } },
      responses: { 200: { description: 'Success' } }
    }
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh JWT token',
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } },
      responses: { 200: { description: 'Success' } }
    }
  },
  '/api/v1/auth/me': {
    get: { tags: ['Auth'], summary: 'Get current user', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/songs': {
    get: { tags: ['Songs'], summary: 'List songs', responses: { 200: { description: 'Success' } } },
    post: { tags: ['Songs'], summary: 'Create a song', responses: { 201: { description: 'Created' } } }
  },
  '/api/v1/songs/{id}': {
    get: { tags: ['Songs'], summary: 'Get song by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
    patch: { tags: ['Songs'], summary: 'Update song', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
    delete: { tags: ['Songs'], summary: 'Delete song', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'No Content' } } }
  },
  '/api/v1/songs/{id}/lyrics': {
    patch: { tags: ['Songs'], summary: 'Update lyrics', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/songs/{id}/parts': {
    put: { tags: ['Songs'], summary: 'Update all parts', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/songs/{id}/parts/{part}': {
    patch: { tags: ['Songs'], summary: 'Update specific part', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'part', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/snippets/signed-url': {
    post: { tags: ['Voice Snippets'], summary: 'Get signed URL for upload', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/snippets': {
    post: { tags: ['Voice Snippets'], summary: 'Save snippet record', responses: { 201: { description: 'Created' } } }
  },
  '/api/v1/snippets/{id}': {
    patch: { tags: ['Voice Snippets'], summary: 'Update snippet', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
    delete: { tags: ['Voice Snippets'], summary: 'Delete snippet', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'No Content' } } }
  },
  '/api/v1/playlists': {
    get: { tags: ['Playlists'], summary: 'List playlists', responses: { 200: { description: 'Success' } } },
    post: { tags: ['Playlists'], summary: 'Create playlist', responses: { 201: { description: 'Created' } } }
  },
  '/api/v1/playlists/{id}': {
    get: { tags: ['Playlists'], summary: 'Get playlist details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
    patch: { tags: ['Playlists'], summary: 'Update playlist', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
    delete: { tags: ['Playlists'], summary: 'Delete playlist', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'No Content' } } }
  },
  '/api/v1/playlists/{id}/active': {
    patch: { tags: ['Playlists'], summary: 'Toggle active Sunday lineup', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean' } } } } } }, responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/playlists/{id}/songs': {
    put: { tags: ['Playlists'], summary: 'Set playlist songs', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/playlists/{id}/roster': {
    post: { tags: ['Roster & Notifications'], summary: 'Save roster', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/playlists/{id}/notify': {
    post: { tags: ['Roster & Notifications'], summary: 'Dispatch roster notifications and emails', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/uniforms': {
    get: { tags: ['Uniforms'], summary: 'List schedules', responses: { 200: { description: 'Success' } } },
    post: { tags: ['Uniforms'], summary: 'Create schedule', responses: { 201: { description: 'Created' } } }
  },
  '/api/v1/notifications': {
    get: { tags: ['Roster & Notifications'], summary: 'List user notifications', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/notifications/read-all': {
    post: { tags: ['Roster & Notifications'], summary: 'Mark all as read', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/ai/curate': {
    post: { tags: ['AI Curator'], summary: 'Generate setlist with Gemini AI', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/users': {
    get: { tags: ['Users'], summary: 'List users', responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/users/{id}': {
    delete: { tags: ['Users'], summary: 'Delete user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'No Content' } } }
  },
  '/api/v1/users/{id}/role': {
    patch: { tags: ['Users'], summary: 'Update user role', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  },
  '/api/v1/external-music/search': {
    get: { tags: ['External Music'], summary: 'Search external music API', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } }
  }
};
