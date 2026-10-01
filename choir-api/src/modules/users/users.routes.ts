import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();
router.use(requireAuth);

// Accessible by all authenticated users
router.get('/me', usersController.getProfile.bind(usersController));
router.patch('/me', usersController.updateProfile.bind(usersController));

// Director only routes
router.use(requireRole('DIRECTOR'));

router.get('/', usersController.getUsers.bind(usersController));
router.patch('/:id/role', usersController.updateUserRole.bind(usersController));
router.delete('/:id', usersController.deleteUser.bind(usersController));

export default router;
