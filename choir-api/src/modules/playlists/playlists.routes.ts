import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { playlistsController } from './playlists.controller';

const router = Router();

// Middleware: all routes require auth
router.use(requireAuth);

router.post('/', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.createPlaylist.bind(playlistsController));
router.patch('/:id', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.updatePlaylist.bind(playlistsController));
router.delete('/:id', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.deletePlaylist.bind(playlistsController));
router.post('/:id/songs', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.setPlaylistSongs.bind(playlistsController));
router.patch('/:id/active', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.setActivePlaylist.bind(playlistsController));

// Any authenticated user
router.get('/', playlistsController.getPlaylists.bind(playlistsController));
router.get('/:id', playlistsController.getPlaylistById.bind(playlistsController));


// Roster Routes
router.get('/:id/roster', playlistsController.getRoster.bind(playlistsController));
router.post('/:id/roster', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.saveRoster.bind(playlistsController));
router.post('/:id/roster/dispatch', requireRole(['DIRECTOR', 'SECTION_LEADER']), playlistsController.dispatchRoster.bind(playlistsController));

export default router;
