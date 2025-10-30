import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Lazy-load S3 Client to ensure environment variables are loaded
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }
  return s3Client;
};

const S3_BUCKET = () => process.env.AWS_S3_BUCKET || 'feriwala-uploads';
const S3_REGION = () => process.env.AWS_REGION || 'ap-south-1';

// Process image with Sharp
export const processImage = async (buffer: Buffer, options?: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}): Promise<Buffer> => {
  const { maxWidth = 1200, maxHeight = 1200, quality = 85 } = options || {};
  
  return await sharp(buffer)
    .resize(maxWidth, maxHeight, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality })
    .toBuffer();
};

// Generate unique filename
export const generateS3Filename = (originalname: string, prefix = 'products'): string => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  return `${prefix}/${timestamp}-${uniqueId}${ext}`;
};

// Upload image to S3
export const uploadToS3 = async (
  buffer: Buffer,
  originalname: string,
  options?: {
    folder?: string;
    resize?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<{ url: string; key: string }> => {
  try {
    const { folder = 'products', resize = true, maxWidth, maxHeight, quality } = options || {};
    
    // Process image if resize is enabled
    const processedBuffer = resize 
      ? await processImage(buffer, { maxWidth, maxHeight, quality })
      : buffer;

    // Generate unique key
    const key = generateS3Filename(originalname, folder);

    // Determine content type
    const ext = path.extname(originalname).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Upload to S3
    const upload = new Upload({
      client: getS3Client(),
      params: {
        Bucket: S3_BUCKET(),
        Key: key,
        Body: processedBuffer,
        ContentType: contentType,
        // Note: ACL removed - bucket should have public access configured via bucket policy
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          originalname: originalname,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    await upload.done();

    // Construct public URL
    const url = `https://${S3_BUCKET()}.s3.${S3_REGION()}.amazonaws.com/${key}`;

    return { url, key };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload multiple images to S3
export const uploadMultipleToS3 = async (
  files: Array<{ buffer: Buffer; originalname: string }>,
  options?: {
    folder?: string;
    resize?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<Array<{ url: string; key: string; originalname: string }>> => {
  const uploadPromises = files.map(async (file) => {
    const result = await uploadToS3(file.buffer, file.originalname, options);
    return {
      ...result,
      originalname: file.originalname
    };
  });

  return await Promise.all(uploadPromises);
};

// Delete file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET(),
      Key: key
    });

    await getS3Client().send(command);
    console.log(`Successfully deleted ${key} from S3`);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Delete multiple files from S3
export const deleteMultipleFromS3 = async (keys: string[]): Promise<void> => {
  const deletePromises = keys.map(key => deleteFromS3(key));
  await Promise.all(deletePromises);
};

// Extract S3 key from URL
export const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    // Match pattern: https://bucket-name.s3.region.amazonaws.com/key
    const match = url.match(/\.amazonaws\.com\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting S3 key:', error);
    return null;
  }
};

// Check if S3 is configured
export const isS3Configured = (): boolean => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID.startsWith('AKIA')
  );
};

// Generate thumbnail
export const generateThumbnail = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(300, 300, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer();
};

// Upload image with thumbnail
export const uploadWithThumbnail = async (
  buffer: Buffer,
  originalname: string,
  folder = 'products'
): Promise<{ url: string; key: string; thumbnailUrl: string; thumbnailKey: string }> => {
  try {
    // Upload main image
    const mainImage = await uploadToS3(buffer, originalname, { folder });

    // Generate and upload thumbnail
    const thumbnailBuffer = await generateThumbnail(buffer);
    const thumbnailName = `thumb-${originalname}`;
    const thumbnail = await uploadToS3(thumbnailBuffer, thumbnailName, { 
      folder: `${folder}/thumbnails`,
      resize: false 
    });

    return {
      url: mainImage.url,
      key: mainImage.key,
      thumbnailUrl: thumbnail.url,
      thumbnailKey: thumbnail.key
    };
  } catch (error) {
    console.error('Upload with thumbnail error:', error);
    throw error;
  }
};

export default {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  deleteMultipleFromS3,
  extractS3KeyFromUrl,
  isS3Configured,
  generateThumbnail,
  uploadWithThumbnail,
  processImage,
  generateS3Filename
};
