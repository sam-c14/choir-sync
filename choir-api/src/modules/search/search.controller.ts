import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { handleControllerError } from '../../lib/errors';

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const rawQ = (req.query.q as string) || '';
      const sanitized = rawQ.replace(/[^\w\s]/gi, '').trim();
      if (!sanitized) {
        return res.json({ songs: [], playlists: [] });
      }

      const tokens = sanitized.split(/\s+/).filter(Boolean);
      const formattedQuery = tokens.map((t) => `${t}:*`).join(' | ');

      const [songs, playlists] = await Promise.all([
        prisma.song.findMany({
          where: {
            OR: [
              { title: { search: formattedQuery } },
              { composer: { search: formattedQuery } },
              { title: { contains: rawQ.trim(), mode: 'insensitive' } },
            ],
          },
          orderBy: {
            _relevance: {
              fields: ['title'],
              search: formattedQuery,
              sort: 'desc',
            },
          },
          take: 5,
          select: { id: true, title: true, composer: true, originalKey: true },
        }),
        prisma.playlist.findMany({
          where: {
            OR: [
              { title: { search: formattedQuery } },
              { description: { search: formattedQuery } },
              { title: { contains: rawQ.trim(), mode: 'insensitive' } },
            ],
          },
          orderBy: {
            _relevance: {
              fields: ['title'],
              search: formattedQuery,
              sort: 'desc',
            },
          },
          take: 5,
          select: { id: true, title: true, serviceDate: true, isActive: true },
        }),
      ]);

      res.json({ songs, playlists });
    } catch (error) {
      return handleControllerError(res, error, 'Failed to perform search', req);
    }
  }
}

export const searchController = new SearchController();
