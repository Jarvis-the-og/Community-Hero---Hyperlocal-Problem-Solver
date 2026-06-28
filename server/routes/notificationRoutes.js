import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.get('/', authenticate, notificationController.getUserNotifications);
router.patch('/:id/read', authenticate, notificationController.markAsRead);

export default router;
