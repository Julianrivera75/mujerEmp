import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as S3Module from '@/lib/s3';

const aws = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(public input: Record<string, unknown>) {}
  }
  class S3Client {
    send = aws.send;
  }
  return {
    S3Client,
    PutObjectCommand: class PutObjectCommand extends Command {},
    GetObjectCommand: class GetObjectCommand extends Command {},
    DeleteObjectCommand: class DeleteObjectCommand extends Command {},
    HeadObjectCommand: class HeadObjectCommand extends Command {},
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(
    async (_client: unknown, command: { input: { Key: string } }, options: { expiresIn: number }) =>
      `https://firmada.test/${command.input.Key}?expira=${options.expiresIn}`,
  ),
}));

let s3: typeof S3Module;

beforeEach(async () => {
  s3 = await vi.importActual<typeof S3Module>('@/lib/s3');
  aws.send.mockReset();
  process.env.S3_ENDPOINT = 'https://almacen.test';
  process.env.S3_ACCESS_KEY_ID = 'id';
  process.env.S3_SECRET_ACCESS_KEY = 'secreto';
  process.env.S3_BUCKET_NAME = 'bucket-de-prueba';
});

describe('configuración', () => {
  it('falla con un mensaje claro si falta el endpoint o el bucket', async () => {
    delete process.env.S3_ENDPOINT;
    await expect(s3.createPresignedDownloadUrl('a/b/c')).rejects.toThrow(/no configurado/);

    process.env.S3_ENDPOINT = 'https://almacen.test';
    delete process.env.S3_BUCKET_NAME;
    await expect(s3.createPresignedDownloadUrl('a/b/c')).rejects.toThrow(/S3_BUCKET_NAME/);
  });
});

describe('URLs firmadas', () => {
  it('la subida vence en 5 minutos y la clave queda en la carpeta de la persona con el nombre saneado', async () => {
    const { uploadUrl, key } = await s3.createPresignedUploadUrl(
      'submission',
      'u1',
      'mi ensayo (final)!.pdf',
      'application/pdf',
    );
    expect(key).toMatch(/^entregas\/u1\/\d+-mi_ensayo__final__\.pdf$/);
    expect(uploadUrl).toContain('expira=300');
  });

  it('el nombre no puede escapar de la carpeta y se limita a 100 caracteres', async () => {
    const { key } = await s3.createPresignedUploadUrl('avatar', 'u1', `../../${'a'.repeat(300)}.png`, 'image/png');
    expect(key.startsWith('avatares/u1/')).toBe(true);
    expect(key.slice('avatares/u1/'.length)).not.toContain('/');
    expect(key.length).toBeLessThan('avatares/u1/'.length + 120);
  });

  it('la descarga vence en una hora por defecto', async () => {
    expect(await s3.createPresignedDownloadUrl('entregas/u1/a.pdf')).toContain('expira=3600');
    expect(await s3.createPresignedDownloadUrl('entregas/u1/a.pdf', 60)).toContain('expira=60');
  });
});

describe('keyBelongsTo', () => {
  it('acepta solo claves de la categoría y la dueña indicadas', () => {
    expect(s3.keyBelongsTo('entregas/u1/a.pdf', 'submission', 'u1')).toBe(true);
    expect(s3.keyBelongsTo('entregas/u2/a.pdf', 'submission', 'u1')).toBe(false);
    expect(s3.keyBelongsTo('recursos/u1/a.pdf', 'submission', 'u1')).toBe(false);
    expect(s3.keyBelongsTo('entregas/u1/../u2/a.pdf', 'submission', 'u1')).toBe(false);
    expect(s3.keyBelongsTo(`entregas/u1/${'a'.repeat(300)}`, 'submission', 'u1')).toBe(false);
    expect(s3.keyBelongsTo(42, 'submission', 'u1')).toBe(false);
    expect(s3.keyBelongsTo(undefined, 'submission', 'u1')).toBe(false);
  });
});

describe('verifyUploadedObject', () => {
  const head = (size: number, type: string) =>
    aws.send.mockResolvedValueOnce({ ContentLength: size, ContentType: type });
  const deleted = () =>
    aws.send.mock.calls.filter(([command]) => 'Key' in command.input && !('Range' in command.input));

  it('acepta un archivo con tamaño y tipo permitidos', async () => {
    head(1000, 'application/pdf');
    expect(await s3.verifyUploadedObject('entregas/u1/a.pdf', 'submission')).toBe(true);
    expect(aws.send).toHaveBeenCalledTimes(1);
  });

  it('rechaza y elimina un archivo demasiado grande', async () => {
    head(16 * 1024 * 1024, 'application/pdf');
    aws.send.mockResolvedValueOnce({});
    expect(await s3.verifyUploadedObject('entregas/u1/a.pdf', 'submission')).toBe(false);
    expect(aws.send).toHaveBeenCalledTimes(2);
    expect(deleted()).toHaveLength(2);
  });

  it('rechaza y elimina un tipo no permitido', async () => {
    head(1000, 'application/x-msdownload');
    aws.send.mockResolvedValueOnce({});
    expect(await s3.verifyUploadedObject('entregas/u1/a.exe', 'submission')).toBe(false);
    expect(aws.send).toHaveBeenCalledTimes(2);
  });

  it('cada categoría aplica su propio límite', async () => {
    head(4 * 1024 * 1024, 'image/png');
    aws.send.mockResolvedValueOnce({});
    expect(await s3.verifyUploadedObject('avatares/u1/a.png', 'avatar')).toBe(false);

    head(4 * 1024 * 1024, 'image/png');
    expect(await s3.verifyUploadedObject('recursos/u1/a.png', 'resource')).toBe(true);
  });

  it('rechaza un archivo vacío o que no existe', async () => {
    head(0, 'application/pdf');
    aws.send.mockResolvedValueOnce({});
    expect(await s3.verifyUploadedObject('entregas/u1/a.pdf', 'submission')).toBe(false);

    aws.send.mockRejectedValueOnce(new Error('NotFound'));
    expect(await s3.verifyUploadedObject('entregas/u1/b.pdf', 'submission')).toBe(false);
  });

  it('no falla si no se puede eliminar el archivo inválido', async () => {
    head(99 * 1024 * 1024, 'application/pdf');
    aws.send.mockRejectedValueOnce(new Error('sin permiso'));
    expect(await s3.verifyUploadedObject('entregas/u1/a.pdf', 'submission')).toBe(false);
  });
});
