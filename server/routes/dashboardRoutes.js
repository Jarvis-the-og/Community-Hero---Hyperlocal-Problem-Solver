import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/index.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = Router();

router.get('/', authenticate, requireRole('authority', 'admin'), dashboardController.getDashboard);
router.get('/:id', authenticate, requireRole('authority', 'admin'), dashboardController.getDashboardIssue);

export default router;
