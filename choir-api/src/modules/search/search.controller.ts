import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { handleControllerError } from '../../lib/errors';

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
          select: { id: true, title: true, composer: true, originalKey: true }
        }),
        prisma.playlist.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, title: true, serviceDate: true, isActive: true }
        })
      ]);

      res.json({ songs, playlists });
    } catch (error) {
      return handleControllerError(res, error, 'Failed to perform search', req);
    }
  }
}

export const searchController = new SearchController();
