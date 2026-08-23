import { prisma } from '../lib/prisma.js';
import { initializePayment, verifyPaymentTransaction } from '../services/paystack.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const checkout = async (req, res, next) => {
  try {
    const { shippingAddress } = req.body;
    if (!shippingAddress) throw new ApiError(400, 'Shipping address details are required');

    // 1. Fetch User Cart
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: { include: { vendor: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Your shopping cart is empty');
    }

    // 2. Group items by Vendor ID
    const itemsByVendor = {};
    let grandTotal = 0;

    for (const item of cart.items) {
      const vendorId = item.product.vendorId;
      const unitPrice = Number(item.product.discountPrice || item.product.price);
      const itemSubtotal = unitPrice * item.quantity;

      grandTotal += itemSubtotal;

      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = {
          vendor: item.product.vendor,
          items: [],
          vendorSubtotal: 0,
        };
      }

      itemsByVendor[vendorId].items.push({
        productId: item.productId,
        productName: item.product.name,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });

      itemsByVendor[vendorId].vendorSubtotal += itemSubtotal;
    }

    // 3. Generate Unique Order Ref
    const orderNumber = `QL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Main Order & Vendor Orders in a Transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const mainOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user.id,
          totalAmount: grandTotal,
          shippingAddressSnapshot: shippingAddress,
          paymentStatus: 'PENDING',
        },
      });

      for (const vendorId in itemsByVendor) {
        const vendorGroup = itemsByVendor[vendorId];
        const commissionRate = Number(vendorGroup.vendor.commissionRate) / 100;
        const commissionAmount = vendorGroup.vendorSubtotal * commissionRate;
        const vendorEarnings = vendorGroup.vendorSubtotal - commissionAmount;

        const vendorOrder = await tx.vendorOrder.create({
          data: {
            orderId: mainOrder.id,
            vendorId,
            subtotal: vendorGroup.vendorSubtotal,
            commissionAmount,
            vendorEarnings,
            status: 'PENDING',
          },
        });

        for (const item of vendorGroup.items) {
          await tx.orderItem.create({
            data: {
              vendorOrderId: vendorOrder.id,
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
            },
          });
        }
      }

      // Clear Shopping Cart after successful order generation
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return mainOrder;
    });

    // 5. Initialize Paystack Payment (Amount in Kobo: Multiply NGN by 100)
    const amountInKobo = Math.round(grandTotal * 100);
    const paystackData = await initializePayment({
      email: req.user.email,
      amountInKobo,
      reference: orderNumber,
      metadata: { orderId: newOrder.id, userId: req.user.id },
    });

    // Save Payment Reference Record
    await prisma.payment.create({
      data: {
        orderId: newOrder.id,
        paystackReference: orderNumber,
        amount: grandTotal,
        status: 'PENDING',
      },
    });

    return ApiResponse.success(res, 201, 'Order created and payment initialized', {
      orderId: newOrder.id,
      orderNumber,
      totalAmount: grandTotal,
      paymentUrl: paystackData.authorization_url,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) throw new ApiError(400, 'Payment reference is required');

    const paystackVerification = await verifyPaymentTransaction(reference);

    if (paystackVerification.status === 'success') {
      const payment = await prisma.payment.findUnique({
        where: { paystackReference: reference },
      });

      if (!payment) throw new ApiError(404, 'Payment record not found');

      if (payment.status !== 'SUCCESS') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'SUCCESS',
              paystackChannel: paystackVerification.channel,
              rawResponse: paystackVerification,
              verifiedAt: new Date(),
            },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'SUCCESS' },
          }),
        ]);
      }

      return ApiResponse.success(res, 200, 'Payment successfully verified', {
        status: 'SUCCESS',
        reference,
      });
    } else {
      return ApiResponse.error(res, 400, 'Payment verification failed', paystackVerification);
    }
  } catch (error) {
    next(error);
  }
};