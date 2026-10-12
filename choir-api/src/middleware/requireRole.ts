import { z } from "zod";
import { Request, Response, NextFunction } from 'express';
import { UserRoleEnum } from '@choir-workspace/shared-validation';
import { sendError } from '../lib/errors';

type Role = z.infer<typeof UserRoleEnum>;

export const requireRole = (allowedRoles: Role | Role[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User not authenticated', undefined, 'UNAUTHORIZED');
    }

    // ADMIN automatically passes any DIRECTOR checks
    if (req.user.role === 'ADMIN' && roles.includes('DIRECTOR')) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'Forbidden: Insufficient permissions for this action', undefined, 'FORBIDDEN');
    }

    next();
  };
};

export const requirePartLeadOrDirector = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return sendError(res, 401, 'Unauthorized: User not authenticated', undefined, 'UNAUTHORIZED');
  }

  if (req.user.role === 'DIRECTOR' || req.user.role === 'ADMIN') {
    return next();
  }

  const { part } = req.params;

  if (req.user.role === 'SECTION_LEADER' && req.user.leadsVoicePart === part) {
    return next();
  }

  return sendError(res, 403, 'Forbidden: Not authorized to edit this voice part', undefined, 'FORBIDDEN');
};
