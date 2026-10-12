import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CreateSongSchema,
  UpdateSongSchema,
  CreateSongPartSchema,
  UpdateSongPartSchema,
  CreateSongLinkSchema,
} from '@choir-workspace/shared-validation';
import { songsService } from './songs.service';
import { handleControllerError, sendError } from '../../lib/errors';

export class SongsController {
  async clearActiveLineup(req: Request, res: Response) {
    try {
      const result = await songsService.clearActiveLineup();
      res.status(200).json(result);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to clear active lineup', req);
    }
  }
  async getSongs(req: Request, res: Response) {
    try {
      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        voicePart: req.query.voicePart as string,
        complexity: req.query.complexity as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        order: req.query.order as 'asc' | 'desc',
      };
      
      const songs = await songsService.getSongs(options);
      res.json(songs);
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch songs', req);
    }
  }

  async getSongById(req: Request, res: Response) {
    try {
      const song = await songsService.getSongById(req.params.id as string);
      res.json(song);
    } catch (error) {
      handleControllerError(res, error, 'Song not found', req);
    }
  }

  async createSong(req: Request, res: Response) {
    try {
      const dto = CreateSongSchema.parse(req.body);
      const song = await songsService.createSong(dto);
      res.status(201).json(song);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to create song', req);
    }
  }

  async updateSong(req: Request, res: Response) {
    try {
      const dto = UpdateSongSchema.parse(req.body);
      const song = await songsService.updateSong(req.params.id as string, dto);
      res.status(200).json(song);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to update song', req);
    }
  }

  async updateLyrics(req: Request, res: Response) {
    try {
      const schema = z.object({
        lyrics: z.string().max(10000).optional().nullable(),
        originalKey: z.string().max(20).optional().nullable(),
      });
      const dto = schema.parse(req.body);
      const song = await songsService.updateSong(req.params.id as string, dto as any);
      res.status(200).json(song);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to update lyrics', req);
    }
  }

  async deleteSong(req: Request, res: Response) {
    try {
      await songsService.deleteSong(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to delete song', req);
    }
  }

  async updateAllParts(req: Request, res: Response) {
    try {
      const schema = z.array(CreateSongPartSchema);
      const dto = schema.parse(req.body);
      const result = await songsService.updateAllParts(req.params.id as string, dto);
      res.status(200).json(result);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to update song parts', req);
    }
  }

  async updatePart(req: Request, res: Response) {
    try {
      const dto = UpdateSongPartSchema.parse(req.body);
      const result = await songsService.updatePart(req.params.id as string, req.params.part as string, dto);
      res.status(200).json(result);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to update voice part notes', req);
    }
  }

  async createLink(req: Request, res: Response) {
    try {
      const dto = CreateSongLinkSchema.parse(req.body);
      const result = await songsService.createLink(req.params.id as string, dto);
      res.status(201).json(result);
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to add reference link', req);
    }
  }

  async deleteLink(req: Request, res: Response) {
    try {
      const result = await songsService.deleteLink(req.params.id as string, req.params.linkId as string);
      if (result.count === 0) return sendError(res, 404, 'Reference link not found', undefined, 'NOT_FOUND');
      res.status(204).send();
    } catch (error: any) {
      handleControllerError(res, error, 'Failed to delete reference link', req);
    }
  }
}

export const songsController = new SongsController();
