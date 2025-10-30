/**
 * WebSocket Integration Examples
 * 
 * This file demonstrates how to integrate WebSocket functionality
 * with various parts of the backend application.
 */

import { WebSocketAPI } from '../websocket/server';

/**
 * Example: Send notification when order is created
 */
export async function notifyOrderCreated(orderId: string, userId: string, orderDetails: any) {
  // Send notification to customer
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Order Confirmed',
    message: `Your order #${orderId} has been confirmed and is being processed.`,
    type: 'success',
    link: `/orders/${orderId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const sent = WebSocketAPI.sendNotification(userId, notification);

  if (sent) {
    console.log(`[Notification] Order created notification sent to user ${userId}`);
  } else {
    console.log(`[Notification] User ${userId} not connected, notification will be stored in DB`);
    // Store notification in database for later retrieval
  }

  // Also save notification to database
  // await prisma.notification.create({ data: notification });
}

/**
 * Example: Broadcast order status update
 */
export async function notifyOrderStatusChanged(
  orderId: string,
  customerId: string,
  sellerId: string,
  status: string,
  previousStatus: string
) {
  // Notify customer
  WebSocketAPI.broadcastOrderUpdate(orderId, status, customerId);

  const customerNotification = {
    id: `notif_${Date.now()}`,
    title: 'Order Status Updated',
    message: `Your order #${orderId} status changed from ${previousStatus} to ${status}.`,
    type: 'info',
    link: `/orders/${orderId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(customerId, customerNotification);

  // Notify seller
  const sellerNotification = {
    id: `notif_${Date.now() + 1}`,
    title: 'Order Status Changed',
    message: `Order #${orderId} status changed to ${status}.`,
    type: 'info',
    link: `/seller/orders/${orderId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(sellerId, sellerNotification);

  console.log(`[Order] Status update broadcast for order ${orderId}`);
}

/**
 * Example: Notify seller of new order
 */
export async function notifySellerNewOrder(sellerId: string, order: any) {
  const sent = WebSocketAPI.notifySellerNewOrder(sellerId, {
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.customerName,
    amount: order.totalAmount,
    items: order.items.length,
    createdAt: order.createdAt,
  });

  if (sent) {
    console.log(`[Seller] New order notification sent to seller ${sellerId}`);
  }

  // Also send general notification
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'New Order Received!',
    message: `You have a new order #${order.orderNumber} worth ₹${order.totalAmount}.`,
    type: 'order',
    link: `/seller/orders/${order.id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(sellerId, notification);
}

/**
 * Example: Send low stock alert to seller
 */
export async function notifyLowStock(sellerId: string, product: any) {
  const sent = WebSocketAPI.sendLowStockAlert(sellerId, {
    productId: product.id,
    productName: product.name,
    currentStock: product.stock,
    threshold: product.lowStockThreshold,
  });

  if (sent) {
    console.log(`[Seller] Low stock alert sent to seller ${sellerId} for product ${product.id}`);
  }

  // Send notification
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Low Stock Alert',
    message: `Your product "${product.name}" is running low on stock (${product.stock} left).`,
    type: 'warning',
    link: `/seller/products/${product.id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(sellerId, notification);
}

/**
 * Example: Send system alert to admins
 */
export async function notifyAdminsSystemAlert(alert: {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  source: string;
  actionRequired?: boolean;
}) {
  WebSocketAPI.sendSystemAlert({
    ...alert,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Admin] System alert broadcast: ${alert.title}`);
}

/**
 * Example: Notify when seller is approved
 */
export async function notifySellerApproved(userId: string, sellerDetails: any) {
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Seller Account Approved!',
    message: 'Congratulations! Your seller account has been approved. You can now start listing products.',
    type: 'success',
    link: '/seller/dashboard',
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(userId, notification);
}

/**
 * Example: Notify when product is approved
 */
export async function notifyProductApproved(sellerId: string, product: any) {
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Product Approved',
    message: `Your product "${product.name}" has been approved and is now live.`,
    type: 'success',
    link: `/seller/products/${product.id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(sellerId, notification);
}

/**
 * Example: Notify user registration to admins
 */
export async function notifyAdminsNewUser(user: any) {
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'New User Registered',
    message: `${user.name} (${user.email}) has registered as a ${user.role}.`,
    type: 'info',
    link: `/admin/users/${user.id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  // Broadcast to all admins
  // In real implementation, you'd query all admin user IDs and send to each
  console.log('[Admin] New user registration notification prepared');
}

/**
 * Example: Send payment success notification
 */
export async function notifyPaymentSuccess(userId: string, orderId: string, amount: number) {
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Payment Successful',
    message: `Your payment of ₹${amount} for order #${orderId} was successful.`,
    type: 'success',
    link: `/orders/${orderId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(userId, notification);
}

/**
 * Example: Send refund notification
 */
export async function notifyRefundProcessed(userId: string, orderId: string, amount: number) {
  const notification = {
    id: `notif_${Date.now()}`,
    title: 'Refund Processed',
    message: `Your refund of ₹${amount} for order #${orderId} has been processed. It will reflect in 5-7 business days.`,
    type: 'info',
    link: `/orders/${orderId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  WebSocketAPI.sendNotification(userId, notification);
}

/**
 * Example: Get system statistics
 */
export function getWebSocketStats() {
  const connectedClients = WebSocketAPI.getConnectedClientsCount();

  return {
    connectedClients,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Example: Check if user is online before sending email
 */
export async function notifyUser(userId: string, notification: any) {
  // Check if user is online
  const isOnline = WebSocketAPI.isUserOnline(userId);

  if (isOnline) {
    // User is online, send via WebSocket
    WebSocketAPI.sendNotification(userId, notification);
    console.log(`[Notification] Sent to online user ${userId} via WebSocket`);
  } else {
    // User is offline, send email
    console.log(`[Notification] User ${userId} offline, sending email instead`);
    // await sendEmail(userId, notification);
  }

  // Always save to database
  // await saveNotificationToDB(notification);
}

// Export all functions
export default {
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifySellerNewOrder,
  notifyLowStock,
  notifyAdminsSystemAlert,
  notifySellerApproved,
  notifyProductApproved,
  notifyAdminsNewUser,
  notifyPaymentSuccess,
  notifyRefundProcessed,
  getWebSocketStats,
  notifyUser,
};
