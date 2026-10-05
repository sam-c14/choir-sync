import { prisma } from '../../lib/prisma';
import { CreateUniformDto, UpdateUniformDto } from '@choir-workspace/shared-validation';
import { supabaseAdmin } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { startOfDay } from 'date-fns';

export class UniformsService {
  async getUniforms(filter: string, page: number = 1, limit: number = 20, fromDate?: string, toDate?: string) {
    const today = startOfDay(new Date());

    let whereClause: any = {};
    if (filter === 'current') {
      const dateFilter: any = { gte: today };
      if (fromDate) {
        const from = new Date(fromDate);
        dateFilter.gte = from > today ? from : today;
      }
      if (toDate) {
        dateFilter.lte = new Date(toDate);
      }
      whereClause = { serviceDate: dateFilter };
    } else if (filter === 'past') {
      const dateFilter: any = { lt: today };
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        dateFilter.lte = to < today ? to : new Date(today.getTime() - 1);
      }
      whereClause = { serviceDate: dateFilter };
    }

    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      prisma.uniformSchedule.findMany({
        where: whereClause,
        orderBy: filter === 'past' ? { serviceDate: 'desc' } : { serviceDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.uniformSchedule.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createUniform(dto: CreateUniformDto) {
    return prisma.uniformSchedule.create({
      data: {
        serviceDate: dto.serviceDate,
        femaleOutfit: dto.femaleOutfit,
        maleOutfit: dto.maleOutfit,
        notes: dto.notes,
        imageUrls: dto.imageUrls || [],
      },
    });
  }

  async updateUniform(id: string, dto: UpdateUniformDto) {
    if (dto.imageUrls) {
      const existing = await prisma.uniformSchedule.findUnique({ where: { id } });
      if (existing && existing.imageUrls.length > 0) {
        const removedUrls = existing.imageUrls.filter(url => !dto.imageUrls?.includes(url));
        if (removedUrls.length > 0) {
          const paths = removedUrls.map(url => {
            const p = url.split('uniform-inspos/')[1];
            return p ? decodeURIComponent(p) : null;
          }).filter(Boolean) as string[];
          if (paths.length > 0) {
            try {
              const { error } = await supabaseAdmin.storage.from('uniform-inspos').remove(paths);
              if (error) throw error;
            } catch (err) {
              logger.error('Failed to remove orphaned images from storage during update', err);
            }
          }
        }
      }
    }

    return prisma.uniformSchedule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteUniform(id: string) {
    const existing = await prisma.uniformSchedule.findUnique({ where: { id } });
    if (existing && existing.imageUrls.length > 0) {
      const paths = existing.imageUrls.map(url => {
        const p = url.split('uniform-inspos/')[1];
        return p ? decodeURIComponent(p) : null;
      }).filter(Boolean) as string[];
      if (paths.length > 0) {
        try {
          const { error } = await supabaseAdmin.storage.from('uniform-inspos').remove(paths);
              if (error) throw error;
        } catch (err) {
          logger.error('Failed to remove orphaned images from storage during delete', err);
        }
      }
    }

    return prisma.uniformSchedule.delete({
      where: { id },
    });
  }
}

export const uniformsService = new UniformsService();
