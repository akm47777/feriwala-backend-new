import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Get user's cart
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            stock: true,
            brand: true,
          },
        },
      },
    });

    const items = cartItems.map((item) => ({
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        images: item.product.images || [],
        image: item.product.images[0] || '',
        brand: item.product.brand || 'Unknown',
      },
      quantity: item.quantity,
      selectedAttributes: {},
      addedAt: item.addedAt.toISOString(),
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const cart = {
      items,
      totalItems,
      totalAmount,
      discount: 0,
      shippingCost: totalAmount > 999 ? 0 : 50,
      finalAmount: totalAmount + (totalAmount > 999 ? 0 : 50),
    };

    res.json({ success: true, data: cart });
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { productId, quantity = 1, attributes } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
        });
      }

      await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
        },
      });
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
router.put('/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
      include: {
        product: {
          select: { stock: true },
        },
      },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    if (quantity > cartItem.product.stock) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    res.json({ success: true, message: 'Cart updated' });
  } catch (error: any) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove item from cart
router.delete('/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { itemId } = req.params;

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
});

// Clear cart
router.delete('/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error: any) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

export default router;
