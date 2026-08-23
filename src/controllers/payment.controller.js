import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

// POST /api/payments/initialize - Initialize Paystack Payment
export const initializePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: req.user.id },
      include: { user: true },
    });

    if (!order) {
      return ApiResponse.error(res, 404, 'Order not found');
    }

    if (order.paymentStatus === 'PAID') {
      return ApiResponse.error(res, 400, 'Order is already paid');
    }

    // Amount in kobo (multiply NGN by 100)
    const amountInKobo = Math.round(Number(order.totalAmount) * 100);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: amountInKobo,
        reference: `QL_${order.id}_${Date.now()}`,
        metadata: {
          orderId: order.id,
          userId: req.user.id,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return ApiResponse.error(res, 400, data.message || 'Payment initialization failed');
    }

    return ApiResponse.success(res, 200, 'Payment initialized successfully', {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/webhook - Handle Paystack Webhooks
export const handleWebhook = async (req, res, next) => {
  try {
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { metadata } = event.data;

      if (metadata?.orderId) {
        await prisma.order.update({
          where: { id: metadata.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'PROCESSING',
          },
        });
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};