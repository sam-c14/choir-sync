import { prisma } from '../../lib/prisma';
import { CreateUniformDto, UpdateUniformDto } from '@choir-workspace/shared-validation';
import { startOfDay } from 'date-fns';

export class UniformsService {
  async getUniforms(filter: string) {
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

    return prisma.uniformSchedule.findMany({
      where: whereClause,
      orderBy: filter === 'past' ? { serviceDate: 'desc' } : { serviceDate: 'asc' },
    });
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
