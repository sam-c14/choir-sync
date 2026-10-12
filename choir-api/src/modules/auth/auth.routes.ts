import { Router } from 'express';
import { authController } from './auth.controller';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/google', authLimiter, authController.googleLogin.bind(authController));
router.post('/refresh', authLimiter, authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));

export default router;
