import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { aiController } from './ai.controller';

const router = Router();
router.use(requireAuth);
// AI tools require DIRECTOR role for now to prevent spam/abuse from choristers
router.post('/curate-setlist', requireRole('DIRECTOR'), aiController.curateSetlist.bind(aiController));

export default router;
