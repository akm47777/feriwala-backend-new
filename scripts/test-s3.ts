#!/usr/bin/env tsx

/**
 * Test script to verify S3 configuration
 * Usage: npm run test:s3
 */

import dotenv from 'dotenv';
import { isS3Configured, uploadToS3, deleteFromS3 } from '../src/services/s3Service';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function testS3Connection() {
  console.log('🧪 Testing S3 Configuration...\n');

  // Check if S3 is configured
  console.log('1. Checking S3 credentials...');
  const configured = isS3Configured();
  
  if (!configured) {
    console.log('❌ S3 is NOT configured');
    console.log('\nRequired environment variables:');
    console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
    console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
    console.log('- AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET ? '✅ Set' : '❌ Missing');
    console.log('- AWS_REGION:', process.env.AWS_REGION || 'ap-south-1 (default)');
    console.log('\nPlease add these to your .env file.');
    return;
  }

  console.log('✅ S3 credentials configured\n');
  console.log('Configuration:');
  console.log('- Bucket:', process.env.AWS_S3_BUCKET);
  console.log('- Region:', process.env.AWS_REGION || 'ap-south-1');
  console.log('- Access Key:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...\n');

  // Test upload with a small test image
  console.log('2. Testing S3 upload...');
  
  try {
    // Create a small test buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const testFilename = `test-${Date.now()}.png`;
    console.log(`Uploading test image: ${testFilename}...`);

    const uploadResult = await uploadToS3(testImageBuffer, testFilename, {
      folder: 'test',
      resize: false
    });

    console.log('✅ Upload successful!');
    console.log('- URL:', uploadResult.url);
    console.log('- Key:', uploadResult.key);
    console.log('\n3. Testing S3 delete...');

    // Test delete
    await deleteFromS3(uploadResult.key);
    console.log('✅ Delete successful!');

    console.log('\n✨ All S3 tests passed! S3 is ready to use.\n');
  } catch (error) {
    console.log('❌ S3 test failed:', error instanceof Error ? error.message : error);
    console.log('\nPossible issues:');
    console.log('1. Invalid AWS credentials');
    console.log('2. S3 bucket does not exist');
    console.log('3. IAM user lacks permissions (PutObject, DeleteObject)');
    console.log('4. Region mismatch');
    console.log('5. Network/firewall issues\n');
  }
}

// Run test
testS3Connection().catch(console.error);
