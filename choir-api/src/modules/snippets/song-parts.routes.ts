import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { snippetsController } from './snippets.controller';

const router = Router();
router.use(requireAuth);

router.post('/:partId/snippets/upload-url', snippetsController.getUploadUrl.bind(snippetsController));
router.post('/:partId/snippets', snippetsController.createSnippet.bind(snippetsController));

export default router;
