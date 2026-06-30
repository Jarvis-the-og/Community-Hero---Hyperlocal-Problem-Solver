import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/index.js';
import * as departmentController from '../controllers/departmentController.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole('department', 'authority', 'admin'),
  departmentController.getDepartmentDashboard
);
router.get(
  '/issues/:id',
  authenticate,
  requireRole('department', 'authority', 'admin'),
  departmentController.getDepartmentIssue
);
router.post(
  '/issues/:id/action',
  authenticate,
  requireRole('department', 'authority', 'admin'),
  departmentController.departmentAction
);
router.post(
  '/issues/:id/comments',
  authenticate,
  requireRole('department', 'authority', 'admin'),
  departmentController.addDepartmentComment
);

export default router;
