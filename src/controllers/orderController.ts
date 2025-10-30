import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import emailService from '../services/emailService';
import { createOrderNumber } from '../utils/orderUtils';

const prisma = new PrismaClient();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface CreateOrderRequest {
  cartItems: Array<{
    productId: string;
    quantity: number;
    selectedAttributes?: any;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  paymentMethod: 'COD' | 'NET_BANKING' | 'UPI' | 'CARD' | 'WALLET';
  couponCode?: string;
  notes?: string;
}

export const createOrder = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const {
      cartItems,
      shippingAddress,
      paymentMethod,
      couponCode,
      notes
    }: CreateOrderRequest = req.body;

    // Validate cart items and calculate totals
    const validatedItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} is not available`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      validatedItems.push({
        product,
        quantity: item.quantity,
        selectedAttributes: item.selectedAttributes,
        price: product.price
      });

      subtotal += product.price * item.quantity;
    }

    // Calculate shipping and tax
    const shippingCost = subtotal >= 499 ? 0 : 50;
    const taxRate = 0.18; // 18% GST
    const tax = subtotal * taxRate;
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      // TODO: Implement coupon functionality when Coupon model is added to schema
      /*
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() }
        }
      });

      if (coupon && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = Math.min(
            (subtotal * coupon.discountValue) / 100,
            coupon.maxDiscountAmount || Infinity
          );
        } else {
          discount = Math.min(coupon.discountValue, subtotal);
        }
      }
      */
    }

    const totalAmount = subtotal + shippingCost + tax - discount;
    const orderNumber = createOrderNumber();

    // Create or find shipping address
    const createdAddress = await prisma.address.create({
      data: {
        userId,
        type: 'HOME', // Using HOME as default since SHIPPING doesn't exist in schema
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country || 'India',
      }
    });

    // Create order in database
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        shippingAddressId: createdAddress.id,
        billingAddressId: createdAddress.id, // Use same as shipping for now
        totalAmount,
        discount,
        shippingCost,
        finalAmount: totalAmount,
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod,
        notes,
        items: {
          create: validatedItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.price,
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true
      }
    });

    // Handle payment based on method
    let paymentResponse = null;

    if (paymentMethod === 'COD') {
      // Cash on Delivery - confirm order immediately
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PENDING' // Will be completed on delivery
        }
      });

      // Update product stock
      await updateProductStock(validatedItems, 'decrease');

      // Send confirmation email  
      const email = `${order.shippingAddress.firstName}@example.com`; // TODO: Get from user
      await emailService.sendOrderConfirmation(email, {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.finalAmount
      });

      paymentResponse = {
        type: 'COD',
        status: 'confirmed',
        message: 'Order placed successfully. Pay on delivery.'
      };

    } else if (paymentMethod === 'NET_BANKING' || paymentMethod === 'UPI' || paymentMethod === 'CARD' || paymentMethod === 'WALLET') {
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Amount in paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          userId: userId
        }
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          method: paymentMethod,
          status: 'PENDING',
          gatewayOrderId: razorpayOrder.id
        }
      });

      paymentResponse = {
        type: 'ONLINE',
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        name: 'Feriwala',
        description: `Order #${orderNumber}`,
        prefill: {
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          email: shippingAddress.email,
          contact: shippingAddress.phone
        }
      };
    }

    res.status(201).json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus
        },
        payment: paymentResponse
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find payment and order
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: razorpay_order_id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            },
            shippingAddress: true,
            user: true
          }
        }
      }
    });

    if (!payment || !payment.order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = payment.order;

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'CONFIRMED',
        paymentStatus: 'COMPLETED'
      }
    });

    // Update product stock
    const validatedItems = order.items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity
    }));
    await updateProductStock(validatedItems, 'decrease');

    // Send confirmation email
    const email = order.user.email;
    await emailService.sendOrderConfirmation(email, {
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.finalAmount
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'confirmed'
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

export const handlePaymentFailure = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, error } = req.body;

    // Find payment and order
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: razorpay_order_id }
    });

    if (payment) {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: error.description || 'Unknown error'
        }
      });

      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'FAILED',
          orderStatus: 'CANCELLED',
          notes: `Payment failed: ${error.description || 'Unknown error'}`
        }
      });
    }

    res.json({
      success: true,
      message: 'Payment failure recorded'
    });

  } catch (error) {
    console.error('Payment failure handling error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle payment failure'
    });
  }
};

const updateProductStock = async (
  items: Array<{ product: any; quantity: number }>,
  operation: 'increase' | 'decrease'
) => {
  for (const item of items) {
    const stockChange = operation === 'decrease' ? -item.quantity : item.quantity;
    
    await prisma.product.update({
      where: { id: item.product.id },
      data: {
        stock: {
          increment: stockChange
        }
      }
    });
  }
};

// Get user orders
export const getUserOrders = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (status) {
      where.orderStatus = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalOrders: totalCount,
          hasNext: skip + Number(limit) < totalCount,
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get single order details
export const getOrderById = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Cancel order
export const cancelOrder = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        orderStatus: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or cannot be cancelled'
      });
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'CANCELLED',
        notes: `Cancelled by customer. Reason: ${reason || 'No reason provided'}`
      }
    });

    // Restore product stock if order was confirmed
    if (order.orderStatus === 'CONFIRMED') {
      const validatedItems = order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      await updateProductStock(validatedItems, 'increase');
    }

    // Handle refund for online payments
    if (order.paymentStatus === 'COMPLETED') {
      // Initiate refund process (implementation depends on payment gateway)
      await initiateRefund(order);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};

const initiateRefund = async (order: any) => {
  // Implement refund logic based on payment method
  try {
    if (order.paymentMethod === 'ONLINE' && order.paymentId) {
      const refund = await razorpay.payments.refund(order.paymentId, {
        amount: Math.round(order.totalAmount * 100),
        notes: {
          reason: 'Order cancellation',
          orderId: order.id
        }
      });

      // Update order with refund details
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'REFUNDED',
          notes: `${order.notes || ''} | Refund ID: ${refund.id}`
        }
      });
    }
  } catch (error) {
    console.error('Refund initiation error:', error);
    // Log error but don't throw - order is already cancelled
  }
};