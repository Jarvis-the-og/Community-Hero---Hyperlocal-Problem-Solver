import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = Router();

router.get('/', authenticate, dashboardController.getDashboard);
router.get('/:id', authenticate, dashboardController.getDashboardIssue);

export default router;
