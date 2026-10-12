import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { LoginDto, GoogleAuthDto } from '@choir-workspace/shared-validation';

import { OAuth2Client } from 'google-auth-library';

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const DEFAULT_CLIENT_ID = '899614270215-orv5fv8rfh96h1oj0cmbbdviktv4u0ql.apps.googleusercontent.com';

const allowedGoogleClientIds = [
  GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID_ANDROID,
  DEFAULT_CLIENT_ID,
].filter(Boolean) as string[];

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID);

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const ACCESS_TOKEN_EXPIRES_IN = '2h';
const REFRESH_TOKEN_EXPIRATION_DAYS = 30;

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  private async createTokenPair(user: any) {
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        leadsVoicePart: user.leadsVoicePart,
        name: user.name,
        comfortableKey: user.comfortableKey,
        participationType: user.participationType,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        avatarUrl: user.avatarUrl,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { 
      token, 
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        createdAt: user.createdAt,
      }
    };
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
    let email: string;
    let googleId: string;
    let name: string | undefined;
    let avatarUrl: string | undefined;

    if (dto.accessToken) {
      // SEC-01 FIX: Validate token audience using Google tokeninfo endpoint
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(dto.accessToken)}`
      );
      if (!tokenInfoRes.ok) {
        throw new Error('Invalid Google access token');
      }
      const tokenInfo = await tokenInfoRes.json();

      const isAudienceValid =
        allowedGoogleClientIds.length === 0 ||
        allowedGoogleClientIds.includes(tokenInfo.aud) ||
        allowedGoogleClientIds.includes(tokenInfo.azp) ||
        allowedGoogleClientIds.includes(tokenInfo.issued_to);

      if (!isAudienceValid) {
        throw new Error('Google access token was not issued for this application');
      }

      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${dto.accessToken}` },
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve Google user profile');
      }
      const profile = await res.json();
      if (!profile.email) {
        throw new Error('No email found in Google profile');
      }
      if (!profile.email_verified) {
        throw new Error('Email must be verified by Google');
      }
      email = profile.email;
      googleId = profile.sub;
      name = profile.name;
      avatarUrl = profile.picture;
    } else if (dto.idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: allowedGoogleClientIds.length > 0 ? allowedGoogleClientIds : undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token or no email found');
      }

      if (!payload.email_verified) {
        throw new Error('Email must be verified by Google');
      }

      email = payload.email;
      googleId = payload.sub;
      name = payload.name;
      avatarUrl = payload.picture;
    } else {
      throw new Error('No Google token provided');
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          provider: 'GOOGLE',
          googleId,
          name: name || null,
          avatarUrl: avatarUrl || null,
        },
      });
    } else {
      const updates: any = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.name && name) updates.name = name;
      if (!user.avatarUrl && avatarUrl) updates.avatarUrl = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    return this.createTokenPair(user);
  }

  async refreshToken(token: string) {
    const hashed = hashToken(token);
    // SEC-07 FIX: Look up by hashed token with fallback to plaintext for tokens issued prior to update
    let storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    if (!storedToken) {
      storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });
    }

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Refresh token expired');
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this.createTokenPair(storedToken.user);
  }

  async logout(token: string) {
    const hashed = hashToken(token);
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ token: hashed }, { token }],
      },
    });
  }
}

export const authService = new AuthService();
