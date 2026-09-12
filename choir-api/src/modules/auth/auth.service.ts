import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { LoginDto } from '@choir-workspace/shared-validation';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export class AuthService {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        leadsVoicePart: user.leadsVoicePart,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token };
  }
}

export const authService = new AuthService();
