import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.post('/google', authController.googleLogin.bind(authController));

export default router;
