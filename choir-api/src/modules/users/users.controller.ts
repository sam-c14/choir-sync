import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { usersService } from './users.service';
import { UpdateUserRoleSchema, UpdateProfileSchema } from '@choir-workspace/shared-validation';
import { supabaseAdmin } from '../../lib/supabase';
import crypto from 'crypto';

export class UsersController {
  async getAvatarUploadUrl(req: Request, res: Response) {
    try {
      const filename = req.body.filename || 'avatar.jpg';
      const userId = (req as any).user.id;
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('avatars')
        .createSignedUploadUrl(path);

      if (error || !data) {
        logger.error('Supabase signed URL error:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL' });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(path);

      res.status(200).json({
        signedUrl: data.signedUrl,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (error: any) {
      logger.error('Get Upload URL Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
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
      logger.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const dto = UpdateUserRoleSchema.parse(req.body);
      const user = await usersService.updateUserRole(req.params.id as string, dto);
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
      if (error.code === 'CONFLICT') return res.status(409).json({ error: error.message });
      logger.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      await usersService.deleteUser(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
      if (error.code === 'FORBIDDEN') return res.status(403).json({ error: error.message });
      logger.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const dto = UpdateProfileSchema.parse(req.body);
      const user = await usersService.updateProfile((req as any).user.id, dto);
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      logger.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = await usersService.getProfile((req as any).user.id);
      res.json(user);
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
      logger.error(error);
      res.status(500).json({ error: error.message });
    }
  }
}
export const usersController = new UsersController();
