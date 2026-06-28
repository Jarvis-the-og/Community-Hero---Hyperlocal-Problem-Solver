import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import * as commentController from '../controllers/commentController.js';

const router = Router();

router.get('/:issueId', authenticate, commentController.getIssueComments);
router.post('/:issueId', authenticate, commentController.createComment);
router.patch('/:id/helpful', authenticate, commentController.markHelpful);

export default router;
