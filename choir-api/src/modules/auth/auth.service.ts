import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { LoginDto, GoogleAuthDto } from '@choir-workspace/shared-validation';

import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
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

  async googleLogin(dto: GoogleAuthDto) {
    const ticket = await googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google token or no email found');
    }
    
    if (!payload.email_verified) {
      throw new Error('Email must be verified by Google');
    }

    const email = payload.email;
    const googleId = payload.sub;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Option A: Default to CHORISTER. No domain restriction.
      user = await prisma.user.create({
        data: {
          email,
          provider: 'GOOGLE',
          googleId,
        },
      });
    } else if (!user.googleId) {
      // Link existing local account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
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
