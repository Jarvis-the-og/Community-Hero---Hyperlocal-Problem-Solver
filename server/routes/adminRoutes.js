import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/index.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'authority'), adminController.getAdminDashboard);
router.get('/rankings', authenticate, requireRole('admin', 'authority'), adminController.getDepartmentRankings);

export default router;
