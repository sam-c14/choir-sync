import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      if (!q || q.trim() === '') {
        return res.json({ songs: [], playlists: [] });
      }

      const query = q.trim();

      const [songs, playlists] = await Promise.all([
        prisma.song.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, title: true, composer: true, key: true }
        }),
        prisma.playlist.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, title: true, serviceDate: true, isActive: true }
        })
      ]);

      res.json({ songs, playlists });
    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  }
}

export const searchController = new SearchController();
