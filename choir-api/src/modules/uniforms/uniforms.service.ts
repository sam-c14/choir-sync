import { prisma } from '../../lib/prisma';
import { CreateUniformDto, UpdateUniformDto } from '@choir-workspace/shared-validation';
import { startOfDay } from 'date-fns';

export class UniformsService {
  async getUniforms(filter: string, page: number = 1, limit: number = 20) {
    const today = startOfDay(new Date());

    let whereClause = {};
    if (filter === 'current') {
      whereClause = {
        serviceDate: {
          gte: today,
        },
      };
    } else if (filter === 'past') {
      whereClause = {
        serviceDate: {
          lt: today,
        },
      };
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
      },
    });
  }

  async updateUniform(id: string, dto: UpdateUniformDto) {
    return prisma.uniformSchedule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteUniform(id: string) {
    return prisma.uniformSchedule.delete({
      where: { id },
    });
  }
}

export const uniformsService = new UniformsService();
