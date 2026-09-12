import { z } from "zod";
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRoleEnum, VoicePartTypeEnum } from '@choir-workspace/shared-validation';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export interface JwtPayload {
  id: string;
  role: z.infer<typeof UserRoleEnum>;
  leadsVoicePart: z.infer<typeof VoicePartTypeEnum> | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
