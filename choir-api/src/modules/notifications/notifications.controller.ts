import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

class NotificationsController {
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(notifications);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      
      const notification = await prisma.notification.updateMany({
        where: { id, userId }, // Ensure user owns it
        data: { isRead: true }
      });
      
      res.json(notification);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
      
      res.json({ updated: result.count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }
}

export const notificationsController = new NotificationsController();
