import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import { createRouteQuotaGuard } from '../middleware/governance.js';
import * as issueController from '../controllers/issueController.js';

const router = Router();

router.use(
  createRouteQuotaGuard({
    name: 'auth',
    windowLimit: 120,
    windowMs: 60 * 60 * 1000,
    scope: 'ip',
    message: 'Too many sign-in requests. Please try again later.',
  })
);

router.post('/sync', authenticate, issueController.syncUser);
router.get('/profile', authenticate, issueController.getProfile);

export default router;
