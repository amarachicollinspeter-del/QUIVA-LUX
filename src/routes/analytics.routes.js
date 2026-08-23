import { Router } from 'express';
import { getVendorAnalytics, getAdminAnalytics } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/vendor', getVendorAnalytics);
router.get('/admin', getAdminAnalytics);

export default router;