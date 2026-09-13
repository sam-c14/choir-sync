import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();
router.use(requireAuth);
router.use(requireRole('DIRECTOR')); // Everything in this route requires Director

router.get('/', usersController.getUsers.bind(usersController));
router.patch('/:id/role', usersController.updateUserRole.bind(usersController));
router.delete('/:id', usersController.deleteUser.bind(usersController));

export default router;
