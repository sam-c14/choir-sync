import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { LoginDto, GoogleAuthDto } from '@choir-workspace/shared-validation';

import { OAuth2Client } from 'google-auth-library';

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const ACCESS_TOKEN_EXPIRES_IN = '2h';
const REFRESH_TOKEN_EXPIRATION_DAYS = 30;

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

export class AuthService {
  private async createTokenPair(user: any) {
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        leadsVoicePart: user.leadsVoicePart,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { token, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return this.createTokenPair(user);
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
      user = await prisma.user.create({
        data: {
          email,
          provider: 'GOOGLE',
          googleId,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    return this.createTokenPair(user);
  }

  async refreshToken(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new Error('Refresh token expired');
    }

    await prisma.refreshToken.delete({ where: { token } });

    return this.createTokenPair(storedToken.user);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  }
}

export const authService = new AuthService();
