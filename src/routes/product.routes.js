import { Router } from 'express';
import { createProduct, getProducts } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', getProducts);
router.post('/', authenticate, authorize('VENDOR', 'ADMIN'), upload.array('images', 5), createProduct);

export default router;