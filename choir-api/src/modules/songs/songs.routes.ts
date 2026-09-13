import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole, requirePartLeadOrDirector } from '../../middleware/requireRole';
import { songsController } from './songs.controller';

const router = Router();

// Middleware: all routes require auth
router.use(requireAuth);

router.post('/', requireRole('DIRECTOR'), songsController.createSong.bind(songsController));
router.patch('/:id', requireRole('DIRECTOR'), songsController.updateSong.bind(songsController));
router.delete('/:id', requireRole('DIRECTOR'), songsController.deleteSong.bind(songsController));
router.put('/:id/parts', requireRole('DIRECTOR'), songsController.updateAllParts.bind(songsController));
router.patch('/:id/parts/:part', requirePartLeadOrDirector, songsController.updatePart.bind(songsController));
router.post('/:id/links', requireRole('DIRECTOR'), songsController.createLink.bind(songsController));
router.delete('/:id/links/:linkId', requireRole('DIRECTOR'), songsController.deleteLink.bind(songsController));

// Any authenticated user
router.get('/', songsController.getSongs.bind(songsController));
router.get('/:id', songsController.getSongById.bind(songsController));

export default router;
