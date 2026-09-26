import { prisma } from '../../lib/prisma';
import { CreatePlaylistDto, UpdatePlaylistDto, CreatePlaylistSongDto } from '@choir-workspace/shared-validation';

export const playlistsService = {
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
    // Delete existing songs and recreate them to ensure fresh ordering
    await prisma.playlistSong.deleteMany({
      where: { playlistId }
    });

    if (songs.length === 0) {
      return [];
    }

    await prisma.playlistSong.createMany({
      data: songs.map((s) => ({
        ...s,
        playlistId
      }))
    });

    return prisma.playlistSong.findMany({
      where: { playlistId },
      orderBy: { orderIndex: 'asc' }
    });
  }
};
