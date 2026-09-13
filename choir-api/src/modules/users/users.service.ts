import { prisma } from '../../lib/prisma';
import { UpdateUserRoleDto } from '@choir-workspace/shared-validation';

export class UsersService {
  async getUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        leadsVoicePart: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
