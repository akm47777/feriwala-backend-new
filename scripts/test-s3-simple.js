require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || '';
const region = process.env.AWS_REGION?.trim() || 'ap-south-1';
const bucket = process.env.AWS_S3_BUCKET?.trim() || '';

console.log('🧪 Testing S3 Upload...\n');
console.log('Configuration:');
console.log('- Access Key:', accessKeyId);
console.log('- Secret Key (first 10 chars):', secretAccessKey.substring(0, 10) + '...');
console.log('- Region:', region);
console.log('- Bucket:', bucket);
console.log('');

if (!accessKeyId || !secretAccessKey || !bucket) {
  console.error('❌ Missing required credentials');
  process.exit(1);
}

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

(async () => {
  try {
    const testData = Buffer.from('Test upload from Feriwala backend - ' + new Date().toISOString());
    const key = `test/test-${Date.now()}.txt`;
    
    console.log(`Uploading to s3://${bucket}/${key}...`);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: testData,
      ContentType: 'text/plain',
    });

    const response = await s3Client.send(command);
    
    console.log('\n✅ SUCCESS! File uploaded to S3');
    console.log('ETag:', response.ETag);
    console.log('URL:', `https://${bucket}.s3.${region}.amazonaws.com/${key}`);
    console.log('\n🎉 S3 is working correctly!');
    
  } catch (error) {
    console.error('\n❌ UPLOAD FAILED');
    console.error('Error:', error.message);
    console.error('Code:', error.Code || 'Unknown');
    console.error('\nFull error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
})();
