import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Configure Cloudinary (not used - using S3 instead)
// Cloudinary is disabled in production
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Ensure upload directory exists
const ensureUploadDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'products');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Memory storage for cloud upload
const memoryStorage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Multer configurations
export const localUpload = multer({
  storage: localStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const cloudUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Process image with Sharp
export const processImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(800, 800, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toBuffer();
};

// Upload to Cloudinary
export const uploadToCloudinary = async (
  buffer: Buffer, 
  folder = 'feriwala/products',
  filename?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const options: any = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' },
        { format: 'webp' }
      ]
    };

    if (filename) {
      options.public_id = filename;
    }

    cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result!.secure_url);
        }
      }
    ).end(buffer);
  });
};

// Save to local storage
export const saveToLocal = async (buffer: Buffer, filename: string): Promise<string> => {
  const uploadPath = path.join(process.cwd(), 'uploads', 'products');
  ensureUploadDir(uploadPath);
  
  const processedBuffer = await processImage(buffer);
  const filePath = path.join(uploadPath, filename);
  
  await fs.promises.writeFile(filePath, processedBuffer);
  
  // Return full URL with backend domain (since frontend is on Vercel)
  const backendUrl = process.env.BACKEND_URL || 'http://13.233.244.213';
  return `${backendUrl}/uploads/products/${filename}`;
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    const parts = imageUrl.split('/');
    const fileWithExt = parts[parts.length - 1];
    const fileName = fileWithExt.split('.')[0];
    const folder = parts.slice(-2, -1)[0];
    const publicId = `${folder}/${fileName}`;
    
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// Delete from local storage
export const deleteFromLocal = async (imagePath: string): Promise<void> => {
  try {
    const fullPath = path.join(process.cwd(), imagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (error) {
    console.error('Error deleting local file:', error);
  }
};

// Generate unique filename
export const generateFilename = (originalname: string): string => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalname);
  return `product-${timestamp}-${random}${ext}`;
};