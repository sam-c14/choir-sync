import { Router } from 'express';
import { uniformsController } from './uniforms.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(requireAuth);

router.get('/', uniformsController.getUniforms.bind(uniformsController));

router.post('/', requireRole('DIRECTOR'), uniformsController.createUniform.bind(uniformsController));
router.patch('/:id', requireRole('DIRECTOR'), uniformsController.updateUniform.bind(uniformsController));
router.delete('/:id', requireRole('DIRECTOR'), uniformsController.deleteUniform.bind(uniformsController));

export default router;
