import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all orders for the authenticated user
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                brand: true,
              }
            }
          }
        },
        shippingAddress: true,
        billingAddress: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific order by ID
router.get('/:orderId', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;
    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId // Ensure user can only see their own orders
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                brand: true,
                description: true,
              }
            },
            variant: true
          }
        },
        shippingAddress: true,
        billingAddress: true,
        payments: true,
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new order
router.post('/', async (req: any, res: any) => {
  try {
    // Check if user is authenticated (optional for guest checkout)
    let userId: string | null = null;
    
    // Try to get user ID from token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
      } catch (err) {
        // Token invalid or expired, continue as guest
        console.log('Invalid token, continuing as guest checkout');
      }
    }
    
    const {
      items,
      shippingAddress,
      paymentMethod,
      totalAmount,
      shippingCost,
      discount = 0,
      guestEmail, // For guest orders
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }
    
    // For guest orders, email is required
    if (!userId && !guestEmail && !shippingAddress.email) {
      return res.status(400).json({ error: 'Email is required for guest orders' });
    }

    // Generate order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    // For guest orders, create a guest user or use existing
    if (!userId) {
      const email = guestEmail || shippingAddress.email;
      let guestUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!guestUser) {
        // Create guest user account
        guestUser = await prisma.user.create({
          data: {
            email,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            phone: shippingAddress.phone,
            role: 'CUSTOMER',
            isVerified: false, // Guest accounts are not verified
          }
        });
      }
      userId = guestUser.id;
    }

    // Create or find shipping address
    let shippingAddressId: string;
    const existingAddress = await prisma.address.findFirst({
      where: {
        userId,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
      }
    });

    if (existingAddress) {
      shippingAddressId = existingAddress.id;
    } else {
      const newAddress = await prisma.address.create({
        data: {
          userId,
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          phone: shippingAddress.phone,
          addressLine1: shippingAddress.address,
          addressLine2: shippingAddress.address2 || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: shippingAddress.country || 'India',
          type: 'HOME',
        }
      });
      shippingAddressId = newAddress.id;
    }

    // Use same address for billing (can be modified later)
    const billingAddressId = shippingAddressId;

    const finalAmount = totalAmount + shippingCost - discount;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        shippingAddressId,
        billingAddressId,
        paymentMethod: paymentMethod.toUpperCase(),
        totalAmount,
        discount,
        shippingCost,
        finalAmount,
        orderStatus: 'PENDING',
        paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'PENDING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || item.id,
            variantId: item.variantId || null,
            quantity: item.quantity,
            price: item.price,
          }))
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                brand: true,
              }
            }
          }
        },
        shippingAddress: true,
      }
    });

    // Clear user's cart
    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    res.status(201).json({
      success: true,
      order,
      message: 'Order placed successfully'
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status (for seller/admin)
router.put('/:orderId/status', authenticate, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, trackingNumber } = req.body;

    // TODO: Add role check for seller/admin
    // For now, allowing any authenticated user (should be restricted)

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus,
        trackingNumber,
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
      }
    });

    res.json({
      success: true,
      order,
      message: 'Order status updated'
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order tracking
router.get('/:orderId/tracking', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;
    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        trackingNumber: true,
        estimatedDelivery: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Return tracking information
    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      timeline: [
        { status: 'PENDING', date: order.createdAt, completed: true },
        { status: 'CONFIRMED', date: order.updatedAt, completed: order.orderStatus !== 'PENDING' },
        { status: 'PROCESSING', completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.orderStatus) },
        { status: 'SHIPPED', completed: ['SHIPPED', 'DELIVERED'].includes(order.orderStatus) },
        { status: 'DELIVERED', completed: order.orderStatus === 'DELIVERED' },
      ]
    };
    
    res.json({ tracking: trackingInfo });
  } catch (error: any) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;