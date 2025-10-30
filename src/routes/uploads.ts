import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Serve uploaded product images
router.get('/uploads/products/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', 'products', safeName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=2592000, immutable', // 30 days
      'Content-Type': 'image/jpeg'
    });

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve image'
    });
  }
});

export default router;
