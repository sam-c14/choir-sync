import { prisma } from '../../lib/prisma';
import {
  CreateSongDto,
  UpdateSongDto,
  CreateSongPartDto,
  UpdateSongPartDto,
  CreateSongLinkDto,
} from '@choir-workspace/shared-validation';
import { VoicePartType } from '@prisma/client';

export class SongsService {
  async getSongs() {
    return prisma.song.findMany({
      include: {
        parts: true,
        links: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSong(dto: CreateSongDto) {
    return prisma.song.create({
      data: {
        title: dto.title,
        composer: dto.composer,
        complexity: dto.complexity,
        tags: dto.tags,
        status: dto.status,
        parts: {
          create: dto.parts,
        },
        links: {
          create: dto.links,
        },
      },
      include: { parts: true, links: true },
    });
  }

  async updateSong(id: string, dto: UpdateSongDto) {
    return prisma.song.update({
      where: { id },
      data: {
        ...dto,
      },
      include: { parts: true, links: true },
    });
  }

  async deleteSong(id: string) {
    return prisma.song.delete({
      where: { id },
    });
  }

  async updateAllParts(id: string, partsDto: CreateSongPartDto[]) {
    // Transaction to replace all parts
    return prisma.$transaction(async (tx) => {
      await tx.songPart.deleteMany({ where: { songId: id } });
      if (partsDto.length > 0) {
        await tx.songPart.createMany({
          data: partsDto.map((p) => ({ ...p, songId: id })),
        });
      }
      return tx.song.findUnique({ where: { id }, include: { parts: true } });
    });
  }

  async updatePart(songId: string, part: string, dto: UpdateSongPartDto) {
    // VoicePart is part of the unique index [songId, voicePart]
    return prisma.songPart.upsert({
      where: {
        songId_voicePart: {
          songId,
          voicePart: part as VoicePartType,
        },
      },
      update: {
        notes: dto.notes,
      },
      create: {
        songId,
        voicePart: part as VoicePartType,
        notes: dto.notes,
      },
    });
  }

  async createLink(songId: string, dto: CreateSongLinkDto) {
    return prisma.songLink.create({
      data: {
        songId,
        platform: dto.platform,
        url: dto.url,
      },
    });
  }
}

export const songsService = new SongsService();
