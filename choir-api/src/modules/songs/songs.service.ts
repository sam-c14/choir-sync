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
  async getSongs(options: {
    page?: number;
    limit?: number;
    search?: string;
    voicePart?: string;
    complexity?: string;
    status?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { composer: { contains: options.search, mode: 'insensitive' } }
      ];
    }
    
    if (options.status) {
      const statuses = options.status.split(',');
      where.status = { in: statuses };
    }
    
    if (options.complexity) {
      where.complexity = options.complexity;
    }

    if (options.voicePart) {
      where.parts = {
        some: { voicePart: options.voicePart }
      };
    }

    const orderBy: any = {};
    if (options.sortBy) {
      orderBy[options.sortBy] = options.order || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: { parts: true, links: true },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.song.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSongById(id: string) {
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        parts: true,
        links: true,
      },
    });
    if (!song) {
      throw new Error('Song not found');
    }
    return song;
  }

  async createSong(dto: CreateSongDto) {
    return prisma.song.create({
      data: {
        title: dto.title,
        composer: dto.composer,
        complexity: dto.complexity,
        tags: dto.tags,
        status: dto.status,
        lyrics: dto.lyrics,
        originalKey: dto.originalKey,
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

  async deleteLink(songId: string, linkId: string) {
    // Ensure the link belongs to the song
    return prisma.songLink.deleteMany({
      where: {
        id: linkId,
        songId: songId,
      },
    });
  }
}

export const songsService = new SongsService();
