import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, currentPassword, newPassword, avatar } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const updateData: any = {};
    if (phone !== undefined) {
      updateData.phone = phone.trim() || null;
    }
    if (avatar !== undefined) {
      // Solo aceptamos keys de nuestro bucket (prefijo "avatares/"), nunca URLs arbitrarias.
      updateData.avatar = typeof avatar === 'string' && avatar.startsWith('avatares/') ? avatar : null;
    }

    // Si desea cambiar contraseña
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Debes ingresar tu contraseña actual para establecer una nueva.' },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta.' },
          { status: 400 }
        );
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      user: updated,
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return NextResponse.json({ error: 'Error al actualizar el perfil.' }, { status: 500 });
  }
}
