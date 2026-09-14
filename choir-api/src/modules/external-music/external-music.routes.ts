import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { searchExternalMusic } from './external-music.controller';

const router = Router();

// Endpoint for all authenticated users to search for music
router.get('/search', requireAuth, searchExternalMusic);

export default router;
