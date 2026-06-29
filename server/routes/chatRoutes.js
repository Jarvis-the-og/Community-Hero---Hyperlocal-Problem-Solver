import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/index.js';
import { createRouteQuotaGuard } from '../middleware/governance.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.use(
  optionalAuthenticate,
  createRouteQuotaGuard({
    name: 'chat',
    dailyLimit: 60,
    scope: 'userOrIp',
    message: 'Chat limit reached for today. Please try again tomorrow.',
  })
);

router.post('/', chatController.chat);

export default router;
