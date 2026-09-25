import { vi } from 'vitest';
import { session } from './helpers/state';
import type * as S3Module from '@/lib/s3';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => session.current,
  signToken: () => 'token-de-prueba',
  setSessionCookie: async () => undefined,
  clearSessionCookie: vi.fn(async () => undefined),
}));

vi.mock('@/lib/s3', async (importOriginal) => {
  const actual = await importOriginal<typeof S3Module>();
  return {
    ...actual,
    verifyUploadedObject: vi.fn(async () => true),
    createPresignedDownloadUrl: vi.fn(async (key: string) => `https://firmada.test/${key}`),
    createPresignedUploadUrl: vi.fn(async (_category: string, ownerId: string, fileName: string) => ({
      uploadUrl: 'https://firmada.test/subida',
      key: `entregas/${ownerId}/${fileName}`,
    })),
    deleteObject: vi.fn(async () => undefined),
  };
});
