import { Request, Response } from 'express';
import { LoginSchema, GoogleAuthSchema, RefreshTokenSchema } from '@choir-workspace/shared-validation';
import { authService } from './auth.service';
import { handleControllerError } from '../../lib/errors';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const dto = LoginSchema.parse(req.body);
      const result = await authService.login(dto);
      res.status(200).json(result);
    } catch (error: any) {
      return handleControllerError(res, error, 'Invalid credentials', req);
    }
  }

  async googleLogin(req: Request, res: Response) {
    try {
      const dto = GoogleAuthSchema.parse(req.body);
      const result = await authService.googleLogin(dto);
      res.status(200).json(result);
    } catch (error: any) {
      return handleControllerError(res, error, 'Google authentication failed', req);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const dto = RefreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(dto.token);
      res.status(200).json(result);
    } catch (error: any) {
      return handleControllerError(res, error, 'Session expired. Please log in again.', req);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const dto = RefreshTokenSchema.parse(req.body);
      await authService.logout(dto.token);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      return handleControllerError(res, error, 'Logout failed', req);
    }
  }
}

export const authController = new AuthController();
