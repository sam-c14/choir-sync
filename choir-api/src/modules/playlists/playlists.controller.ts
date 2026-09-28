import { Request, Response } from 'express';
import { playlistsService } from './playlists.service';
import { CreatePlaylistSchema, UpdatePlaylistSchema, CreatePlaylistSongSchema, CreateRosterSchema } from '@choir-workspace/shared-validation';
import { z } from 'zod';
import { EmailService } from '../../lib/email.service';
import { prisma } from '../../lib/prisma';


export const playlistsController = {
  async setActivePlaylist(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      // Default to true if not provided to support old clients
      const isActive = req.body.isActive !== undefined ? req.body.isActive : true;
      const playlist = await playlistsService.setActivePlaylist(id, isActive);
      res.json(playlist);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to set active playlist' });
    }
  },

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
,

  async getRoster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const roster = await prisma.serviceRoster.findUnique({
        where: { playlistId: id },
        include: {
          members: {
            include: { user: { select: { id: true, email: true, role: true } } }
          }
        }
      });
      res.json(roster || { members: [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch roster' });
    }
  },

  async saveRoster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const parsed = CreateRosterSchema.parse(req.body);

      const playlist = await prisma.playlist.findUnique({ where: { id } });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      const result = await prisma.$transaction(async (tx) => {
        let roster = await tx.serviceRoster.findUnique({ where: { playlistId: id } });
        if (!roster) {
          roster = await tx.serviceRoster.create({ data: { playlistId: id } });
        }

        await tx.rosterMember.deleteMany({
          where: { rosterId: roster.id }
        });

        if (parsed.members.length > 0) {
          // Ensure uniqueness by userId (take the last assigned role if there are duplicates)
          const uniqueMembersMap = new Map();
          for (const m of parsed.members) {
            uniqueMembersMap.set(m.userId, m);
          }
          const uniqueMembers = Array.from(uniqueMembersMap.values());

          await tx.rosterMember.createMany({
            data: uniqueMembers.map(m => ({
              rosterId: roster.id,
              userId: m.userId,
              assignedRole: m.assignedRole,
              notes: m.notes,
              notified: false
            }))
          });
        }

        return tx.serviceRoster.findUnique({
          where: { id: roster.id },
          include: { members: { include: { user: { select: { id: true, email: true, role: true } } } } }
        });
      }, {
        maxWait: 5000,
        timeout: 20000,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.issues });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to save roster', details: error.message || String(error) });
    }
  },

  async dispatchRoster(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      const roster = await prisma.serviceRoster.findUnique({
        where: { playlistId: id },
        include: { 
          members: {
            include: { user: true }
          }, 
          playlist: {
            include: {
              songs: {
                orderBy: { orderIndex: 'asc' },
                include: { song: true }
              }
            }
          } 
        }
      });

      if (!roster) return res.status(404).json({ error: 'Roster not found' });
      if (roster.members.length === 0) return res.status(400).json({ error: 'Roster is empty' });

      const unnotifiedMembers = roster.members.filter((m: any) => !m.notified);
      
      if (unnotifiedMembers.length === 0) {
        return res.json({ message: 'All members already notified', notifiedCount: 0, emailsSentCount: 0 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.rosterMember.updateMany({
          where: { rosterId: roster.id, notified: false },
          data: { notified: true }
        });

        await tx.notification.createMany({
          data: unnotifiedMembers.map((m: any) => ({
            userId: m.userId,
            title: 'New Service Assignment',
            message: `You have been assigned as ${m.assignedRole} for "${roster.playlist.title}".`,
            linkUrl: `/playlists/${id}`
          }))
        });
      });

      // Dispatch Emails Concurrently
      const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:4200';
      const emailPromises = unnotifiedMembers.map(async (m: any) => {
        if (!m.user?.email) return { sent: false };
        
        return EmailService.sendRosterAssignmentEmail({
          recipientEmail: m.user.email,
          recipientName: m.user.name || '',
          assignedRole: m.assignedRole,
          notes: m.notes,
          playlistTitle: roster.playlist.title,
          serviceDate: roster.playlist.serviceDate,
          playlistUrl: `${frontendUrl}/playlists/${id}`,
          songs: roster.playlist.songs.map((ps: any) => ({
            title: ps.song.title,
            key: ps.customKey || ps.song.originalKey,
            leadSinger: ps.leadSinger
          }))
        });
      });

      const emailResults = await Promise.allSettled(emailPromises);
      const emailsSentCount = emailResults.filter(
        r => r.status === 'fulfilled' && r.value && (r.value as any).sent
      ).length;

      res.json({ 
        message: 'Roster dispatched successfully', 
        notifiedCount: unnotifiedMembers.length,
        emailsSentCount
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to dispatch roster', details: error.message || String(error) });
    }
  }
};