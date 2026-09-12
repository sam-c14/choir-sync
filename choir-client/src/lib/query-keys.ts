export const queryKeys = {
  songs: {
    all: ['songs'] as const,
    detail: (id: string) => ['songs', id] as const,
  },
  auth: {
    user: ['auth', 'user'] as const,
  }
};
