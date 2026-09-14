import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { LoginSchema, GoogleAuthSchema } from '@choir-workspace/shared-validation';
import { authService } from './auth.service';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const dto = LoginSchema.parse(req.body);
      const result = await authService.login(dto);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(401).json({ error: error.message });
    }
  }

  async googleLogin(req: Request, res: Response) {
    try {
      const dto = GoogleAuthSchema.parse(req.body);
      const result = await authService.googleLogin(dto);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(401).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();
