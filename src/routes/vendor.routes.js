import { Router } from 'express';
import { registerVendorStore, getVendorProfile } from '../controllers/vendor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/register', authenticate, upload.single('storeLogo'), registerVendorStore);
router.get('/me', authenticate, getVendorProfile);

export default router;