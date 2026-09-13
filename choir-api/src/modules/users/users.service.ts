import { prisma } from '../../lib/prisma';
import { UpdateUserRoleDto } from '@choir-workspace/shared-validation';

export class UsersService {
  async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          leadsVoicePart: true,
          provider: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto) {
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      throw { code: 'NOT_FOUND', message: 'User not found' };
    }

    if (userToUpdate.role === 'DIRECTOR' && dto.role !== 'DIRECTOR') {
      const directorCount = await prisma.user.count({ where: { role: 'DIRECTOR' } });
      if (directorCount <= 1) {
        throw { code: 'CONFLICT', message: 'Cannot demote the last remaining Director' };
      }
    }

    const leadsVoicePart = dto.role === 'SECTION_LEADER' ? dto.leadsVoicePart : null;

    return prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        leadsVoicePart,
      },
      select: {
        id: true,
        email: true,
        role: true,
        leadsVoicePart: true,
        provider: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      throw { code: 'NOT_FOUND', message: 'User not found' };
    }
    if (userToDelete.role === 'DIRECTOR') {
      throw { code: 'FORBIDDEN', message: 'Cannot delete a Director account' };
    }
    
    await prisma.user.delete({ where: { id } });
  }
}
export const usersService = new UsersService();
