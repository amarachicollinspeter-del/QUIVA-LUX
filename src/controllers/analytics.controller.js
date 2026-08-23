import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../utils/apiResponse.js';

// GET /api/analytics/vendor - Vendor Dashboard Metrics
export const getVendorAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      return ApiResponse.error(res, 404, 'Vendor profile not found');
    }

    // Total products listed by vendor
    const totalProducts = await prisma.product.count({
      where: { vendorId: vendor.id },
    });

    // Orders containing vendor products
    const orderItems = await prisma.orderItem.findMany({
      where: { product: { vendorId: vendor.id } },
      include: { order: true },
    });

    const totalOrders = new Set(orderItems.map((item) => item.orderId)).size;

    // Calculate total earnings from paid orders
    const totalRevenue = orderItems.reduce((acc, item) => {
      if (item.order?.paymentStatus === 'PAID') {
        return acc + Number(item.price) * item.quantity;
      }
      return acc;
    }, 0);

    return ApiResponse.success(res, 200, 'Vendor analytics loaded', {
      totalProducts,
      totalOrders,
      totalRevenue,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/admin - System-wide Admin Metrics
export const getAdminAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return ApiResponse.error(res, 403, 'Access denied. Admin authorization required.');
    }

    const [totalUsers, totalVendors, totalProducts, totalOrders] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.product.count(),
      prisma.order.count(),
    ]);

    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { totalAmount: true },
    });

    const totalPlatformRevenue = paidOrders.reduce((acc, order) => acc + Number(order.totalAmount), 0);

    return ApiResponse.success(res, 200, 'Admin analytics loaded', {
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      totalPlatformRevenue,
    });
  } catch (error) {
    next(error);
  }
};