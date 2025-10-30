import { Router } from 'express';
import { 
  cloudUpload, 
  uploadToCloudinary, 
  saveToLocal, 
  generateFilename,
  deleteFromCloudinary,
  deleteFromLocal 
} from '../services/imageUploadService';
import { 
  uploadToS3, 
  isS3Configured, 
  extractS3KeyFromUrl,
  deleteFromS3,
  uploadWithThumbnail 
} from '../services/s3Service';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Single image upload
router.post('/single', authenticateToken, cloudUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    let imageUrl: string;
    let imageKey: string | undefined;
    let storageType: 's3' | 'local';

    // Use S3 if configured, otherwise local storage
    try {
      if (isS3Configured()) {
        console.log('Using S3 storage...');
        const result = await uploadToS3(req.file.buffer, req.file.originalname, {
          folder: 'products',
          resize: true,
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 85
        });
        imageUrl = result.url;
        imageKey = result.key;
        storageType = 's3';
      } else {
        console.log('Using local storage...');
        const filename = generateFilename(req.file.originalname);
        imageUrl = await saveToLocal(req.file.buffer, filename);
        storageType = 'local';
      }
    } catch (uploadError) {
      console.error('Primary upload failed, falling back to local storage:', uploadError);
      const filename = generateFilename(req.file.originalname);
      imageUrl = await saveToLocal(req.file.buffer, filename);
      storageType = 'local';
    }

    res.json({
      success: true,
      data: {
        imageUrl,
        imageKey,
        storageType,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload image' 
    });
  }
});

// Multiple images upload
router.post('/multiple', authenticateToken, cloudUpload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No files uploaded' 
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      let imageUrl: string;
      let imageKey: string | undefined;
      let storageType: 's3' | 'local';

      try {
        if (isS3Configured()) {
          const result = await uploadToS3(file.buffer, file.originalname, {
            folder: 'products',
            resize: true,
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 85
          });
          imageUrl = result.url;
          imageKey = result.key;
          storageType = 's3';
        } else {
          const filename = generateFilename(file.originalname);
          imageUrl = await saveToLocal(file.buffer, filename);
          storageType = 'local';
        }
      } catch (uploadError) {
        console.error('Upload failed for file, using local storage:', uploadError);
        const filename = generateFilename(file.originalname);
        imageUrl = await saveToLocal(file.buffer, filename);
        storageType = 'local';
      }

      return {
        imageUrl,
        imageKey,
        storageType,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    });    const uploadResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: {
        images: uploadResults,
        count: uploadResults.length
      },
      message: `${uploadResults.length} images uploaded successfully`
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload images' 
    });
  }
});

// Delete image
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, imageKey } = req.body;
    
    if (!imageUrl && !imageKey) {
      return res.status(400).json({ 
        success: false,
        message: 'Image URL or key is required' 
      });
    }

    // Determine storage type and delete accordingly
    if (imageKey || (imageUrl && imageUrl.includes('amazonaws.com'))) {
      // S3 storage
      const key = imageKey || extractS3KeyFromUrl(imageUrl);
      if (key) {
        await deleteFromS3(key);
      }
    } else if (imageUrl && imageUrl.includes('cloudinary.com')) {
      // Cloudinary storage
      await deleteFromCloudinary(imageUrl);
    } else if (imageUrl && imageUrl.startsWith('/uploads/')) {
      // Local storage
      await deleteFromLocal(imageUrl);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL or key'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete image' 
    });
  }
});

// Upload with thumbnail (for product images)
router.post('/with-thumbnail', authenticateToken, cloudUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    if (!isS3Configured()) {
      return res.status(400).json({
        success: false,
        message: 'S3 is not configured. Thumbnail feature requires S3.'
      });
    }

    const result = await uploadWithThumbnail(
      req.file.buffer,
      req.file.originalname,
      'products'
    );

    res.json({
      success: true,
      data: {
        ...result,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: 'Image and thumbnail uploaded successfully'
    });
  } catch (error) {
    console.error('Upload with thumbnail error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload image with thumbnail' 
    });
  }
});

// Serve local images
router.get('/products/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = `uploads/products/${filename}`;
  res.sendFile(imagePath, { root: process.cwd() }, (err) => {
    if (err) {
      res.status(404).json({ 
        success: false,
        message: 'Image not found' 
      });
    }
  });
});

export default router;