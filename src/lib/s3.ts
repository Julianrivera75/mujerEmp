import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Almacenamiento S3 no configurado (faltan variables de entorno).');
  }

  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
}

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME no configurado.');
  return bucket;
}

/** Categorías de archivo permitidas, cada una con su carpeta y restricciones. */
export const UPLOAD_CATEGORIES = {
  submission: {
    prefix: 'entregas',
    maxSizeBytes: 15 * 1024 * 1024, // 15 MB
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  },
  resource: {
    prefix: 'recursos',
    maxSizeBytes: 25 * 1024 * 1024, // 25 MB
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  },
  avatar: {
    prefix: 'avatares',
    maxSizeBytes: 3 * 1024 * 1024, // 3 MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  certificate: {
    prefix: 'certificados',
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ['application/pdf'],
  },
} as const;

export type UploadCategory = keyof typeof UPLOAD_CATEGORIES;

/** Genera una URL firmada (PUT) para que el cliente suba un archivo directo a S3. */
export async function createPresignedUploadUrl(
  category: UploadCategory,
  ownerId: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const config = UPLOAD_CATEGORIES[category];
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100);
  const key = `${config.prefix}/${ownerId}/${Date.now()}-${safeName}`;

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  return { uploadUrl, key };
}

/** Genera una URL firmada (GET) de corta duración para leer/descargar un archivo privado. */
export async function createPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}
