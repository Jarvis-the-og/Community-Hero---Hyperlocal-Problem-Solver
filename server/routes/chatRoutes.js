import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.post('/', authenticate, chatController.chat);

export default router;
