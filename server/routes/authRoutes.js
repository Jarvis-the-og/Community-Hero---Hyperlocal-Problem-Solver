import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as issueController from '../controllers/issueController.js';

const router = Router();

router.post('/sync', authenticate, issueController.syncUser);
router.get('/profile', authenticate, issueController.getProfile);

export default router;
