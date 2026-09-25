import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
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

/** Verifica que el key pertenezca al usuario y a la categoría: "<prefijo>/<idDelUsuario>/<archivo>". */
export function keyBelongsTo(key: unknown, category: UploadCategory, ownerId: string): key is string {
  if (typeof key !== 'string' || key.length > 300 || key.includes('..')) return false;
  return key.startsWith(`${UPLOAD_CATEGORIES[category].prefix}/${ownerId}/`);
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, i) => bytes[offset + i] === value);

/** Comprueba que los primeros bytes del archivo correspondan al tipo declarado (no basta con confiar en el nombre ni en el tipo). */
export function matchesSignature(contentType: string, bytes: Uint8Array): boolean {
  switch (contentType) {
    case 'application/pdf':
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]); // %PDF
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8); // RIFF....WEBP
    default:
      return false;
  }
}

/**
 * Comprueba en el almacenamiento que el archivo subido exista, no supere el tamaño máximo
 * y tenga un tipo permitido, y que su contenido real corresponda a ese tipo. Si no cumple, lo elimina. El cliente declara tamaño y tipo al
 * pedir la URL firmada, así que esta es la verificación que realmente se puede confiar.
 */
export async function verifyUploadedObject(key: string, category: UploadCategory): Promise<boolean> {
  const config = UPLOAD_CATEGORIES[category];
  try {
    const client = getS3Client();
    const head = await client.send(new HeadObjectCommand({ Bucket: getBucketName(), Key: key }));
    const size = head.ContentLength ?? 0;
    const type = (head.ContentType ?? '').toLowerCase();
    let valid = size > 0 && size <= config.maxSizeBytes && (config.allowedTypes as readonly string[]).includes(type);
    if (valid) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: getBucketName(), Key: key, Range: 'bytes=0-15' }),
      );
      const bytes = (await object.Body?.transformToByteArray()) ?? new Uint8Array();
      valid = matchesSignature(type, bytes);
    }
    if (!valid) {
      await deleteObject(key).catch(() => undefined);
    }
    return valid;
  } catch {
    return false;
  }
}
