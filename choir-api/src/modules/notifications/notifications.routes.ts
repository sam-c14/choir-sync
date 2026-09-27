import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { notificationsController } from './notifications.controller';

const router = Router();
router.use(requireAuth);

router.get('/', notificationsController.getNotifications.bind(notificationsController));
router.patch('/read-all', notificationsController.markAllAsRead.bind(notificationsController));
router.patch('/:id/read', notificationsController.markAsRead.bind(notificationsController));

export default router;
