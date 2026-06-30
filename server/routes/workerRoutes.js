import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/index.js';
import { upload } from '../middleware/upload.js';
import * as workerController from '../controllers/workerController.js';

const router = Router();

router.get('/tasks', authenticate, requireRole('worker'), workerController.getWorkerTasks);
router.get('/tasks/:id', authenticate, requireRole('worker'), workerController.getWorkerTask);
router.patch('/tasks/:id', authenticate, requireRole('worker'), workerController.workerUpdateTask);
router.post(
  '/tasks/:id/images',
  authenticate,
  requireRole('worker'),
  upload.array('media', 5),
  workerController.workerUploadImages
);

export default router;
