import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', leaderboardController.getTopUsers);

export default router;
