const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(filePath, keyName) {
  const content = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: keyName,
    Body: content,
    ContentType: 'audio/mpeg',
  });
  
  await s3Client.send(command);
  console.log(`Uploaded ${keyName} to R2`);
  console.log(`Public URL: ${process.env.NEXT_PUBLIC_R2_URL}/${keyName}`);
}

async function main() {
  await uploadFile('C:/Users/Luong/Downloads/Minigame/Point_Tally_Finale.mp3', 'music/Point_Tally_Finale.mp3');
  await uploadFile('C:/Users/Luong/Downloads/Minigame/tina-minigame/public/sounds/The_Final_Handover.mp3', 'music/The_Final_Handover.mp3');
}

main().catch(console.error);
