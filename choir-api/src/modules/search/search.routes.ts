import { Router } from 'express';
import { searchController } from './search.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);
router.get('/', searchController.search.bind(searchController));

export default router;
