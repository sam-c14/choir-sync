import { z } from "zod";
import { Request, Response, NextFunction } from 'express';
import { UserRoleEnum } from '@choir-workspace/shared-validation';

type Role = z.infer<typeof UserRoleEnum>;

export const requireRole = (allowedRoles: Role | Role[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    next();
  };
};

export const requirePartLeadOrDirector = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  if (req.user.role === 'DIRECTOR') {
    return next();
  }

  const { part } = req.params;

  if (req.user.role === 'SECTION_LEADER' && req.user.leadsVoicePart === part) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Not authorized to edit this part' });
};
