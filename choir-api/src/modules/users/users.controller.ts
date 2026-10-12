import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { usersService } from './users.service';
import { UpdateUserRoleSchema, UpdateProfileSchema } from '@choir-workspace/shared-validation';
import { supabaseAdmin } from '../../lib/supabase';
import { handleControllerError, sendError } from '../../lib/errors';
import crypto from 'crypto';
import path from 'path';

export class UsersController {
  async getAvatarUploadUrl(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      // Sanitize extension and enforce safe image types to prevent path traversal or unsafe file types
      const rawExt = path.extname(req.body.filename || '').toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.heif'];
      const ext = allowedExts.includes(rawExt) ? rawExt : '.jpg';
      const storagePath = `${userId}/${Date.now()}-${crypto.randomUUID()}${ext}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('avatars')
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        logger.error('Supabase signed URL error:', error);
        return sendError(res, 500, 'Failed to generate upload URL');
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(storagePath);

      res.status(200).json({
        signedUrl: data.signedUrl,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to generate upload URL');
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const assignable = req.query.assignable === 'true';
      const result = await usersService.getUsers(page, limit, assignable);
      res.json(result);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to fetch users');
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const dto = UpdateUserRoleSchema.parse(req.body);
      const user = await usersService.updateUserRole(req.params.id as string, dto);
      res.json(user);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to update user role');
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      await usersService.deleteUser(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to delete user');
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const dto = UpdateProfileSchema.parse(req.body);
      const user = await usersService.updateProfile((req as any).user.id, dto);
      res.json(user);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to update profile');
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = await usersService.getProfile((req as any).user.id);
      res.json(user);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to fetch profile');
    }
  }
}
export const usersController = new UsersController();
