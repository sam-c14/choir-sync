import { z } from "zod";
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRoleEnum, VoicePartTypeEnum } from '@choir-workspace/shared-validation';
import { sendError } from '../lib/errors';

const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required')

export interface JwtPayload {
  id: string;
  email?: string;
  role: z.infer<typeof UserRoleEnum>;
  leadsVoicePart: z.infer<typeof VoicePartTypeEnum> | null;
}

// Module augmentation — preferred over namespace for ESLint flat config
declare module 'express' {
  export interface Request {
    user?: JwtPayload;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized: No token provided', undefined, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (_err) {
    return sendError(res, 401, 'Unauthorized: Invalid token', undefined, 'UNAUTHORIZED');
  }
};
