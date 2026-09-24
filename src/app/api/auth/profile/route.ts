import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cleanText, validatePassword } from '@/lib/validators';
import { deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

const BCRYPT_COST = 12;

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, currentPassword, newPassword, avatar } = body;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const updateData: { phone?: string | null; avatar?: string | null; passwordHash?: string } = {};
    let previousAvatar: string | null = null;

    if (phone !== undefined) {
      updateData.phone = cleanText(phone, 30);
    }

    if (avatar !== undefined) {
      if (avatar === null) {
        updateData.avatar = null;
        previousAvatar = dbUser.avatar;
      } else {
        // Solo se acepta un archivo propio, ya subido al almacenamiento y con tamaño y tipo válidos.
        if (!keyBelongsTo(avatar, 'avatar', user.id) || !(await verifyUploadedObject(avatar, 'avatar'))) {
          return NextResponse.json(
            { error: 'La foto de perfil no es válida. Sube una imagen PNG, JPG o WebP de hasta 3 MB.' },
            { status: 400 },
          );
        }
        updateData.avatar = avatar;
        if (dbUser.avatar && dbUser.avatar !== avatar) previousAvatar = dbUser.avatar;
      }
    }

    if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json(
          { error: 'Debes ingresar tu contraseña actual para establecer una nueva.' },
          { status: 400 },
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 });
      }

      const passwordError = validatePassword(newPassword.trim());
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }

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
  } catch (error) {
    logError('auth/profile', error);
    return NextResponse.json({ error: 'Error al actualizar el perfil.' }, { status: 500 });
  }
}
