import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET, getR2PublicUrl } from '@/lib/r2';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    // Generate a unique filename using a random UUID/hash and keep extension
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const randomId = crypto.randomBytes(16).toString('hex');
    const key = `uploads/${randomId}.${ext}`;

    // Create S3 put command
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      // Setting ACL to public-read is optional if bucket default is public via Custom Dev URL
    });

    // Generate a presigned URL valid for 5 minutes
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    const finalUrl = getR2PublicUrl(key);

    return NextResponse.json({
      presignedUrl,
      publicUrl: finalUrl,
      key,
    });
  } catch (err: any) {
    console.error('Error generating presigned URL:', err);
    return NextResponse.json({ error: 'Failed to generate presigned URL', details: err.message }, { status: 500 });
  }
}
