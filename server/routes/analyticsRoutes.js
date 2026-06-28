import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();

router.get('/', authenticate, analyticsController.getStats);

export default router;
