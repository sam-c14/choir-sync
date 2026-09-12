import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole, requirePartLeadOrDirector } from '../../middleware/requireRole';

const router = Router();

// Middleware: all routes require auth
router.use(requireAuth);

router.post('/', requireRole('DIRECTOR'), (req: Request, res: Response) => {
  res.status(201).json({ message: 'Dummy POST /songs' });
});

router.patch('/:id', requireRole('DIRECTOR'), (req: Request, res: Response) => {
  res.status(200).json({ message: 'Dummy PATCH /songs/:id' });
});

router.delete('/:id', requireRole('DIRECTOR'), (req: Request, res: Response) => {
  res.status(200).json({ message: 'Dummy DELETE /songs/:id' });
});

router.put('/:id/parts', requireRole('DIRECTOR'), (req: Request, res: Response) => {
  res.status(200).json({ message: 'Dummy PUT /songs/:id/parts' });
});

router.patch('/:id/parts/:part', requirePartLeadOrDirector, (req: Request, res: Response) => {
  res.status(200).json({ message: 'Dummy PATCH /songs/:id/parts/:part' });
});

router.post('/:id/links', requireRole('DIRECTOR'), (req: Request, res: Response) => {
  res.status(201).json({ message: 'Dummy POST /songs/:id/links' });
});

// Any authenticated user
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Dummy GET /songs' });
});

export default router;
