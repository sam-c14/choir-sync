import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { aiController } from './ai.controller';
import { aiLimiter } from '../../middleware/rateLimiter';

const router = Router();
router.use(requireAuth);
// AI tools require DIRECTOR role for now to prevent spam/abuse from choristers
router.post('/curate-setlist', requireRole('DIRECTOR'), aiLimiter, aiController.curateSetlist.bind(aiController));
router.post('/chat', aiLimiter, aiController.chat.bind(aiController));

export default router;
