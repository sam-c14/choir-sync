import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();
router.use(requireAuth);

// Accessible by all authenticated users
router.get('/me', usersController.getProfile.bind(usersController));
router.patch('/me', usersController.updateProfile.bind(usersController));
router.post('/upload-avatar-url', usersController.getAvatarUploadUrl.bind(usersController));

router.get('/', requireRole(['DIRECTOR', 'SECTION_LEADER']), usersController.getUsers.bind(usersController));
router.patch('/:id/role', requireRole(['DIRECTOR', 'ADMIN']), usersController.updateUserRole.bind(usersController));
router.delete('/:id', requireRole('ADMIN'), usersController.deleteUser.bind(usersController));

export default router;
