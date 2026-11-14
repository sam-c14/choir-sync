import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { audioRoomsController } from './audio-rooms.controller';

const router = Router();

// All audio room endpoints require authentication
router.use(requireAuth);

// Room CRUD & membership
router.get('/', audioRoomsController.listRooms.bind(audioRoomsController));
router.post('/', audioRoomsController.createRoom.bind(audioRoomsController));
router.get('/:id', audioRoomsController.getRoom.bind(audioRoomsController));
router.patch('/:id', audioRoomsController.updateRoom.bind(audioRoomsController));
router.post('/:id/join', audioRoomsController.joinRoom.bind(audioRoomsController));
router.post('/:id/leave', audioRoomsController.leaveRoom.bind(audioRoomsController));
router.patch('/:id/participants/:userId', audioRoomsController.updateParticipantRole.bind(audioRoomsController));

// Cloudflare Calls SFU Broker / Proxy Endpoints
router.post('/:id/session', audioRoomsController.createSession.bind(audioRoomsController));
router.post('/:id/tracks', audioRoomsController.proxyTracks.bind(audioRoomsController));
router.put('/:id/tracks', audioRoomsController.proxyTracks.bind(audioRoomsController));
router.put('/:id/renegotiate', audioRoomsController.proxyRenegotiation.bind(audioRoomsController));
router.put('/:id/tracks/close', audioRoomsController.proxyCloseTracks.bind(audioRoomsController));

export default router;
