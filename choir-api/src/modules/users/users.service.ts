import { prisma } from '../../lib/prisma';
import { UpdateUserRoleDto, UpdateProfileDto } from '@choir-workspace/shared-validation';

export class UsersService {
  async getUsers(page: number = 1, limit: number = 20, assignable: boolean = false) {
    const skip = (page - 1) * limit;
    
    const where = assignable ? { participationType: { not: 'MUSICIAN' as any } } : {};
    
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          comfortableKey: true,
          role: true,
          leadsVoicePart: true,
          provider: true,
          createdAt: true,
          avatarUrl: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
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
        name: true,
        comfortableKey: true,
        role: true,
        leadsVoicePart: true,
        participationType: true,
        provider: true,
        createdAt: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
      },
    });
  }

  async deleteUser(id: string) {
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      throw { code: 'NOT_FOUND', message: 'User not found' };
    }
    if (userToDelete.role === 'DIRECTOR' || userToDelete.role === 'ADMIN') {
      throw { code: 'FORBIDDEN', message: 'Cannot delete a Director or Admin account' };
    }
    
    await prisma.user.delete({ where: { id } });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        comfortableKey: dto.comfortableKey,
        participationType: dto.participationType,
        hasCompletedOnboarding: dto.hasCompletedOnboarding,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        comfortableKey: true,
        role: true,
        leadsVoicePart: true,
        participationType: true,
        provider: true,
        createdAt: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
      }
    });
  }

  async getProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        comfortableKey: true,
        role: true,
        leadsVoicePart: true,
        participationType: true,
        provider: true,
        createdAt: true,
        hasCompletedOnboarding: true,
        avatarUrl: true,
      }
    });
    if (!user) throw { code: 'NOT_FOUND', message: 'User not found' };
    return user;
  }
}
export const usersService = new UsersService();
