import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { usersService } from './users.service';
import { UpdateUserRoleSchema } from '@choir-workspace/shared-validation';

export class UsersController {
  async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await usersService.getUsers(page, limit);
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
}
export const usersController = new UsersController();
