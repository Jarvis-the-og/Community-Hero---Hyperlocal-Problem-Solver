import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/index.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();

router.get('/', authenticate, requireRole('authority', 'admin', 'department'), analyticsController.getStats);

export default router;
