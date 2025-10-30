import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/products
 * Get all products with filtering, sorting, and pagination
 * Public endpoint - no auth required
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      search,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc',
      gender,
      brand,
      inStock,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (gender) {
      where.gender = gender;
    }

    if (brand) {
      where.brand = brand;
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    // Get products and total count
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sort as string]: order },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { reviews: true, orderItems: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate average rating for each product
    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        const ratings = await prisma.review.aggregate({
          where: { productId: product.id },
          _avg: { rating: true },
        });

        return {
          ...product,
          averageRating: ratings._avg.rating || 0,
          reviewCount: product._count.reviews,
          salesCount: product._count.orderItems,
        };
      })
    );

    res.json({
      success: true,
      data: {
        products: productsWithRatings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 * Public endpoint
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format (24 hex characters)
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        variants: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true, orderItems: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Calculate average rating
    const ratings = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
    });

    res.json({
      success: true,
      data: {
        ...product,
        averageRating: ratings._avg.rating || 0,
        reviewCount: product._count.reviews,
        salesCount: product._count.orderItems,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
});

/**
 * POST /api/products
 * Create new product
 * Protected - Admin or Seller only
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'RESELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        name,
        description,
        shortDescription,
        price,
        originalPrice,
        discount,
        categoryId,
        subcategoryId,
        stock,
        images,
        gender,
        ageGroup,
        brand,
        sku,
        tags,
        material,
        fabric,
        pattern,
        fit,
        sleeve,
        season,
      } = req.body;

      // Validation
      if (!name || !description || !price || !categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, price, and category are required',
        });
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name,
          description,
          shortDescription: shortDescription || description,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
          discount: discount ? parseFloat(discount) : 0,
          categoryId,
          subcategoryId: subcategoryId || null,
          stock: parseInt(stock) || 0,
          images: images || [],
          gender: gender || 'UNISEX',
          ageGroup: ageGroup || 'ADULT',
          brand: brand || 'Unknown',
          sku: sku || `SKU-${Date.now()}`,
          tags: tags || [],
          material: material || null,
          fabric: fabric || null,
          pattern: pattern || null,
          fit: fit || null,
          sleeve: sleeve || null,
          season: season || null,
          isActive: true,
        },
        include: {
          category: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create product',
      });
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product
 * Protected - Admin or Seller only
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RESELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: any = { ...req.body };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Convert numeric fields
      if (updateData.price) updateData.price = parseFloat(updateData.price);
      if (updateData.compareAtPrice) updateData.compareAtPrice = parseFloat(updateData.compareAtPrice);
      if (updateData.stock) updateData.stock = parseInt(updateData.stock);

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error: any) {
      console.error('Error updating product:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update product',
      });
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (soft delete by setting isActive = false)
 * Protected - Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Soft delete - just set isActive to false
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: product,
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
      });
    }
  }
);

/**
 * PATCH /api/products/:id/stock
 * Update product stock
 * Protected - Admin or Seller only
 */
router.patch(
  '/:id/stock',
  authenticate,
  authorize('ADMIN', 'RESELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { stock, operation = 'set' } = req.body;

      if (stock === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Stock value is required',
        });
      }

      const stockValue = parseInt(stock);
      let updateData: any;

      if (operation === 'increment') {
        updateData = { stock: { increment: stockValue } };
      } else if (operation === 'decrement') {
        updateData = { stock: { decrement: stockValue } };
      } else {
        updateData = { stock: stockValue };
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: product,
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
      });
    }
  }
);

export default router;