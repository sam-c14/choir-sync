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

export class SongsController {
  async getSongs(req: Request, res: Response) {
    try {
      const songs = await songsService.getSongs();
      res.json(songs);
    } catch (_err) {
      res.status(500).json({ message: 'Failed to fetch songs' });
    }
  }

  async getSongById(req: Request, res: Response) {
    try {
      const song = await songsService.getSongById(req.params.id as string);
      res.json(song);
    } catch (_err) {
      res.status(404).json({ message: 'Song not found' });
    }
  }

  async createSong(req: Request, res: Response) {
    try {
      const dto = CreateSongSchema.parse(req.body);
      const song = await songsService.createSong(dto);
      res.status(201).json(song);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: error.message });
    }
  }

  async updateSong(req: Request, res: Response) {
    try {
      const dto = UpdateSongSchema.parse(req.body);
      const song = await songsService.updateSong(req.params.id as string, dto);
      res.status(200).json(song);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      if (error.code === 'P2025') return res.status(404).json({ error: 'Song not found' });
      res.status(500).json({ error: error.message });
    }
  }

  async deleteSong(req: Request, res: Response) {
    try {
      await songsService.deleteSong(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Song not found' });
      res.status(500).json({ error: error.message });
    }
  }

  async updateAllParts(req: Request, res: Response) {
    try {
      // Expects an array of parts
      const schema = z.array(CreateSongPartSchema);
      const dto = schema.parse(req.body);
      const result = await songsService.updateAllParts(req.params.id as string, dto);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: error.message });
    }
  }

  async updatePart(req: Request, res: Response) {
    try {
      const dto = UpdateSongPartSchema.parse(req.body);
      const result = await songsService.updatePart(req.params.id as string, req.params.part as string, dto);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: error.message });
    }
  }

  async createLink(req: Request, res: Response) {
    try {
      const dto = CreateSongLinkSchema.parse(req.body);
      const result = await songsService.createLink(req.params.id as string, dto);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: error.message });
    }
  }
}

export const songsController = new SongsController();
