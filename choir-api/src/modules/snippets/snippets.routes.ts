import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { snippetsController } from './snippets.controller';

const router = Router();
router.use(requireAuth);

router.patch('/:id', snippetsController.updateSnippet.bind(snippetsController));
router.delete('/:id', snippetsController.deleteSnippet.bind(snippetsController));

export default router;
