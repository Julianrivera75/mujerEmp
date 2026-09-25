import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { profileSchema } from '@/lib/schemas';
import { deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { cleanText, validatePassword } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const BCRYPT_COST = 12;

export const PUT = withAuth('auth/profile', 'any', async (req, user) => {
  const { phone, currentPassword, newPassword, avatar } = await parseBody(req, profileSchema);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new HttpError(404, 'Usuario no encontrado.');

  const updateData: { phone?: string | null; avatar?: string | null; passwordHash?: string } = {};
  let previousAvatar: string | null = null;

  if (phone !== undefined) {
    updateData.phone = cleanText(phone ?? '', 30);
  }

  if (avatar !== undefined) {
    if (avatar === null) {
      updateData.avatar = null;
      previousAvatar = dbUser.avatar;
    } else {
      // Solo se acepta un archivo propio, ya subido al almacenamiento y con tamaño y tipo válidos.
      if (!keyBelongsTo(avatar, 'avatar', user.id) || !(await verifyUploadedObject(avatar, 'avatar'))) {
        throw new HttpError(400, 'La foto de perfil no es válida. Sube una imagen PNG, JPG o WebP de hasta 3 MB.');
      }
      updateData.avatar = avatar;
      if (dbUser.avatar && dbUser.avatar !== avatar) previousAvatar = dbUser.avatar;
    }
  }

  if (newPassword && newPassword.trim().length > 0) {
    if (!currentPassword) {
      throw new HttpError(400, 'Debes ingresar tu contraseña actual para establecer una nueva.');
    }
    if (!(await bcrypt.compare(currentPassword, dbUser.passwordHash))) {
      throw new HttpError(400, 'La contraseña actual es incorrecta.');
    }
    const passwordError = validatePassword(newPassword.trim());
    if (passwordError) throw new HttpError(400, passwordError);

    updateData.passwordHash = await bcrypt.hash(newPassword.trim(), BCRYPT_COST);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: { id: true, name: true, email: true, phone: true, avatar: true },
  });

  if (previousAvatar) {
    await deleteObject(previousAvatar).catch(() => undefined);
  }

  return NextResponse.json({ success: true, message: 'Perfil actualizado exitosamente.', user: updated });
});
