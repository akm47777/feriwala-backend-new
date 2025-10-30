import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '@/middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all seller routes
router.use(authenticate);
router.use(authorize('RESELLER', 'ADMIN'));

// GET /api/seller/dashboard - aggregated stats for seller
router.get('/seller/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    // Get reseller profile for the authenticated user
    const reseller = await prisma.reseller.findUnique({
      where: { userId: req.user!.id },
      include: { user: true },
    });

    if (!reseller) {
      return res.json({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        averageRating: 0,
        revenueGrowth: 0,
        ordersGrowth: 0,
        viewsGrowth: 0,
        pendingOrders: 0,
        lowStockProducts: 0,
        unreadMessages: 0,
      });
    }

    // Calculate total products count
    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    });

    // Calculate total orders
    const totalOrders = await prisma.order.count();

    // Calculate pending orders
    const pendingOrders = await prisma.order.count({
      where: { orderStatus: 'PENDING' },
    });

    // Calculate total revenue from completed orders
    const revenueData = await prisma.order.aggregate({
      where: { paymentStatus: 'COMPLETED' },
      _sum: { finalAmount: true },
    });
    const totalRevenue = revenueData._sum.finalAmount || 0;

    // Calculate low stock products (stock < 10)
    const lowStockProducts = await prisma.product.count({
      where: { stock: { lt: 10 }, isActive: true },
    });

    // Calculate average rating across all products
    const ratingData = await prisma.review.aggregate({
      _avg: { rating: true },
    });
    const averageRating = ratingData._avg.rating || 0;

    // Calculate growth metrics (comparing last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [recentOrders, previousOrders] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    const ordersGrowth =
      previousOrders > 0
        ? ((recentOrders - previousOrders) / previousOrders) * 100
        : 0;

    const [recentRevenue, previousRevenue] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { finalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { finalAmount: true },
      }),
    ]);

    const recentRevenueValue = recentRevenue._sum.finalAmount || 0;
    const previousRevenueValue = previousRevenue._sum.finalAmount || 0;
    const revenueGrowth =
      previousRevenueValue > 0
        ? ((recentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100
        : 0;

    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      totalProducts,
      averageRating: Math.round(averageRating * 10) / 10,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      ordersGrowth: Math.round(ordersGrowth * 10) / 10,
      viewsGrowth: 15.7, // TODO: Implement views tracking
      pendingOrders,
      lowStockProducts,
      unreadMessages: 0, // TODO: Implement messaging system
    });
  } catch (error) {
    console.error('Error fetching seller dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/seller/orders/recent - recent orders list
router.get('/seller/orders/recent', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, price: true } },
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.orderNumber,
      customerName: `${order.user.firstName} ${order.user.lastName}`,
      productName: order.items[0]?.product.name || 'Multiple Items',
      amount: order.finalAmount,
      status: order.orderStatus,
      orderDate: order.createdAt.toISOString(),
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// GET /api/seller/products/top - top products list
router.get('/seller/products/top', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      take: 10,
      where: { isActive: true },
      orderBy: { stock: 'desc' },
      include: {
        _count: {
          select: {
            reviews: true,
            orderItems: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
        orderItems: {
          select: { quantity: true, price: true },
        },
      },
    });

    const formattedProducts = products.map((product) => {
      const totalSales = product._count.orderItems;
      const totalRevenue = product.orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : 0;

      return {
        id: product.id,
        name: product.name,
        sales: totalSales,
        revenue: Math.round(totalRevenue),
        views: Math.floor(Math.random() * 5000) + 1000, // TODO: Implement views tracking
        rating: Math.round(avgRating * 10) / 10,
        stock: product.stock,
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

export default router;