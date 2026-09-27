import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { playlistsController } from './playlists.controller';

const router = Router();

// Middleware: all routes require auth
router.use(requireAuth);

router.post('/', requireRole('DIRECTOR'), playlistsController.createPlaylist.bind(playlistsController));
router.patch('/:id', requireRole('DIRECTOR'), playlistsController.updatePlaylist.bind(playlistsController));
router.delete('/:id', requireRole('DIRECTOR'), playlistsController.deletePlaylist.bind(playlistsController));
router.post('/:id/songs', requireRole('DIRECTOR'), playlistsController.setPlaylistSongs.bind(playlistsController));

// Any authenticated user
router.get('/', playlistsController.getPlaylists.bind(playlistsController));
router.get('/:id', playlistsController.getPlaylistById.bind(playlistsController));


// Roster Routes
router.get('/:id/roster', playlistsController.getRoster.bind(playlistsController));
router.post('/:id/roster', requireRole('DIRECTOR'), playlistsController.saveRoster.bind(playlistsController));
router.post('/:id/roster/dispatch', requireRole('DIRECTOR'), playlistsController.dispatchRoster.bind(playlistsController));

export default router;
