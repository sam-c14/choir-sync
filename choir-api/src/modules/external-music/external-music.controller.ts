import { Request, Response } from 'express';
import { z } from 'zod';
import { searchSpotifyTracks, searchYouTubeVideos } from './external-music.service';
import { handleControllerError } from '../../lib/errors';

const SearchQuerySchema = z.object({
  q: z.string().min(1, "Query is required"),
  source: z.enum(['spotify', 'youtube']).optional().default('spotify')
});

export const searchExternalMusic = async (req: Request, res: Response) => {
  try {
    const { q, source } = SearchQuerySchema.parse(req.query);
    const results = source === 'youtube' 
      ? await searchYouTubeVideos(q)
      : await searchSpotifyTracks(q);
    res.json(results);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to search external music', req);
  }
};
