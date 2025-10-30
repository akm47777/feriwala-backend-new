import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/categories
 * Get all categories with optional subcategories
 * Public endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { includeSubcategories } = req.query;

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: includeSubcategories === 'true' ? {
        subcategories: {
          orderBy: { name: 'asc' }
        }
      } : undefined
    });

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 * Public endpoint
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

export default router;