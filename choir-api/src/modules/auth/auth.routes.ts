import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.post('/google', authController.googleLogin.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));

export default router;
