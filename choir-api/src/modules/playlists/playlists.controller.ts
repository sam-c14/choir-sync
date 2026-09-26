import { Request, Response } from 'express';
import { playlistsService } from './playlists.service';
import { CreatePlaylistSchema, UpdatePlaylistSchema, CreatePlaylistSongSchema } from '@choir-workspace/shared-validation';
import { z } from 'zod';

export const playlistsController = {
  async getPlaylists(req: Request, res: Response) {
    try {
      const playlists = await playlistsService.getPlaylists();
      res.json(playlists);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  },

  async getPlaylistById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const playlist = await playlistsService.getPlaylistById(id);
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      res.json(playlist);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch playlist' });
    }
  },

  async createPlaylist(req: Request, res: Response) {
    try {
      const data = CreatePlaylistSchema.parse(req.body);
      const playlist = await playlistsService.createPlaylist(data, req.user!.id);
      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as z.ZodError).issues });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  },

  async updatePlaylist(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = UpdatePlaylistSchema.parse(req.body);
      const playlist = await playlistsService.updatePlaylist(id, data);
      res.json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as z.ZodError).issues });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to update playlist' });
    }
  },

  async deletePlaylist(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await playlistsService.deletePlaylist(id);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete playlist' });
    }
  },

  async setPlaylistSongs(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = z.array(CreatePlaylistSongSchema).parse(req.body);
      const songs = await playlistsService.setPlaylistSongs(id, data);
      res.json(songs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as z.ZodError).issues });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to update playlist songs' });
    }
  }
};
