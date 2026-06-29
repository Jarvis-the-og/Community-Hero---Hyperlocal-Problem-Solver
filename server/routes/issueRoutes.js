import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import { createRouteQuotaGuard } from '../middleware/governance.js';
import { upload } from '../middleware/upload.js';
import * as issueController from '../controllers/issueController.js';

const router = Router();

router.get('/', authenticate, issueController.getAllIssues);
router.get('/nearby', authenticate, issueController.getNearby);
router.get('/:id', authenticate, issueController.getIssue);
router.post(
  '/analyze',
  authenticate,
  createRouteQuotaGuard({
    name: 'report-analysis',
    dailyLimit: 40,
    scope: 'userOrIp',
    message: 'Report analysis limit reached for today.',
  }),
  upload.single('media'),
  issueController.analyzeMedia
);
router.post('/check-duplicates', authenticate, issueController.checkDuplicates);
router.post('/', authenticate, upload.array('media', 5), issueController.createNewIssue);
router.post('/:id/support', authenticate, issueController.supportExistingIssue);
router.patch('/:id/status', authenticate, issueController.updateIssueStatus);
router.post(
  '/:id/resolution-images',
  authenticate,
  upload.array('media', 5),
  issueController.uploadResolutionImages
);

export default router;
