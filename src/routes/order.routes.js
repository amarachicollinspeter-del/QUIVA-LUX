import { Router } from 'express';
import { checkout, verifyPayment } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/checkout', authenticate, checkout);
router.get('/verify-payment', verifyPayment);

export default router;