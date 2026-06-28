import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import { upload } from '../middleware/upload.js';
import * as verificationController from '../controllers/verificationController.js';

const router = Router();

router.get('/:issueId', authenticate, verificationController.getIssueVerifications);
router.post(
  '/:issueId',
  authenticate,
  upload.array('evidence', 3),
  verificationController.submitVerification
);
router.post('/:issueId/verify-resolution', authenticate, verificationController.verifyResolution);

export default router;
