export const createOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp.slice(-8)}-${random}`;
};

export const calculateShipping = (subtotal: number, location?: string): number => {
  // Free shipping above ₹499
  if (subtotal >= 499) {
    return 0;
  }
  
  // Standard shipping rates
  return 50;
};

export const calculateTax = (subtotal: number, state?: string): number => {
  // 18% GST for all states in India
  return Math.round(subtotal * 0.18 * 100) / 100;
};

export const validatePincode = (pincode: string): boolean => {
  // Indian pincode validation (6 digits)
  return /^[1-9][0-9]{5}$/.test(pincode);
};

export const getEstimatedDeliveryDate = (pincode: string): Date => {
  const baseDate = new Date();
  
  // Metropolitan cities - 2-3 days
  const metroCities = ['400', '110', '560', '600', '700', '500'];
  const isMetro = metroCities.some(prefix => pincode.startsWith(prefix));
  
  if (isMetro) {
    baseDate.setDate(baseDate.getDate() + 2);
  } else {
    // Other cities - 3-5 days
    baseDate.setDate(baseDate.getDate() + 4);
  }
  
  return baseDate;
};

export const formatOrderNumber = (orderNumber: string): string => {
  return orderNumber.replace(/^ORD-/, '#');
};

export const getOrderStatusMessage = (status: string): string => {
  const statusMessages = {
    'PENDING': 'Order received and being processed',
    'CONFIRMED': 'Order confirmed and being prepared',
    'PROCESSING': 'Order is being packed',
    'SHIPPED': 'Order shipped and on the way',
    'DELIVERED': 'Order delivered successfully',
    'CANCELLED': 'Order has been cancelled',
    'REFUNDED': 'Order refunded'
  };
  
  return statusMessages[status as keyof typeof statusMessages] || 'Status unknown';
};