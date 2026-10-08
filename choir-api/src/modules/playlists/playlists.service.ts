import { prisma } from '../../lib/prisma';
import { CreatePlaylistDto, UpdatePlaylistDto, CreatePlaylistSongDto } from '@choir-workspace/shared-validation';

export const playlistsService = {
  async setActivePlaylist(id: string, isActive: boolean = true) {
    return prisma.$transaction(async (tx) => {
      if (!isActive) {
        // Deactivate playlist
        const playlist = await tx.playlist.update({
          where: { id },
          data: { isActive: false },
          include: { songs: { select: { songId: true } } }
        });
        const songIds = playlist.songs.map((ps: any) => ps.songId);
        if (songIds.length > 0) {
          await tx.song.updateMany({
            where: { id: { in: songIds }, status: 'ACTIVE_SUNDAY' },
            data: { status: 'ARCHIVED' }
          });
        }
        return playlist;
      }

      // Activate playlist
      // 1. Mark all playlists as inactive
      await tx.playlist.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // 2. Mark target playlist as active
      const activePlaylist = await tx.playlist.update({
        where: { id },
        data: { isActive: true },
        include: {
          songs: { select: { songId: true } }
        }
      });

      const songIds = activePlaylist.songs.map((ps: any) => ps.songId);

      // 3. Find songs currently ACTIVE_SUNDAY that are NOT in this playlist and set to ARCHIVED
      await tx.song.updateMany({
        where: {
          status: 'ACTIVE_SUNDAY',
          id: { notIn: songIds }
        },
        data: { status: 'ARCHIVED' }
      });

      // 4. Update all songs in this playlist to ACTIVE_SUNDAY
      if (songIds.length > 0) {
        await tx.song.updateMany({
          where: { id: { in: songIds } },
          data: { status: 'ACTIVE_SUNDAY' }
        });
      }

      return activePlaylist;
    });
  },

  async getPlaylists() {
    return prisma.playlist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, email: true }
        }
      }
    });
  },

  async getPlaylistById(id: string) {
    return prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: {
          orderBy: { orderIndex: 'asc' },
          include: {
            song: true
          }
        },
        createdBy: {
          select: { id: true, email: true }
        }
      }
    });
  },

  async createPlaylist(data: CreatePlaylistDto, userId: string) {
    return prisma.playlist.create({
      data: {
        ...data,
        createdById: userId,
      }
    });
  },

  async updatePlaylist(id: string, data: UpdatePlaylistDto) {
    return prisma.playlist.update({
      where: { id },
      data
    });
  },

  async deletePlaylist(id: string) {
    return prisma.playlist.delete({
      where: { id }
    });
  },

  async setPlaylistSongs(playlistId: string, songs: CreatePlaylistSongDto[]) {
    return prisma.$transaction(async (tx) => {
      const playlist = await tx.playlist.findUnique({
        where: { id: playlistId },
        select: { isActive: true }
      });

      // Delete existing songs and recreate them to ensure fresh ordering
      await tx.playlistSong.deleteMany({
        where: { playlistId }
      });

      if (songs.length > 0) {
        await tx.playlistSong.createMany({
          data: songs.map((s) => ({
            ...s,
            playlistId
          }))
        });
      }

      if (playlist?.isActive) {
        const newSongIds = songs.map(s => s.songId);
        
        // 1. Any song that is currently ACTIVE_SUNDAY but no longer in this active playlist becomes ARCHIVED
        await tx.song.updateMany({
          where: {
            status: 'ACTIVE_SUNDAY',
            ...(newSongIds.length > 0 ? { id: { notIn: newSongIds } } : {})
          },
          data: { status: 'ARCHIVED' }
        });

        // 2. Any new song added to the active playlist becomes ACTIVE_SUNDAY
        if (newSongIds.length > 0) {
          await tx.song.updateMany({
            where: { id: { in: newSongIds } },
            data: { status: 'ACTIVE_SUNDAY' }
          });
        }
      }

      return tx.playlistSong.findMany({
        where: { playlistId },
        orderBy: { orderIndex: 'asc' }
      });
    });
  }
};
