import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.warn('WARNING: Cloudflare R2 Storage credentials are not fully configured in environment variables.');
}

/**
 * Global S3 Client configured for Cloudflare R2
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId || 'placeholder'}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || 'placeholder',
    secretAccessKey: secretAccessKey || 'placeholder',
  },
});

export const R2_BUCKET = bucketName;
export const NEXT_PUBLIC_R2_URL = process.env.NEXT_PUBLIC_R2_URL;

/**
 * Returns the final public URL for a given object key using the R2 Public Dev URL or Custom Domain.
 */
export const getR2PublicUrl = (key: string): string => {
  if (!NEXT_PUBLIC_R2_URL) return '';
  // Ensure we don't double slash
  const baseUrl = NEXT_PUBLIC_R2_URL.endsWith('/') ? NEXT_PUBLIC_R2_URL.slice(0, -1) : NEXT_PUBLIC_R2_URL;
  return `${baseUrl}/${key}`;
};
