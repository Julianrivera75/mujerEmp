import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { setViewCookie } from '@/lib/auth';
import { HOME_BY_ROLE } from '@/lib/roles';
import { switchRoleSchema } from '@/lib/schemas';

/** Cambia la vista activa de una cuenta con más de un rol (por ejemplo, de Mentor a Estudiante). */
export const POST = withAuth('auth/switch-role', 'any', async (req, user) => {
  const { role } = await parseBody(req, switchRoleSchema);
  if (!user.roles.includes(role)) throw new HttpError(403, 'Tu cuenta no tiene ese rol.');

  await setViewCookie(role);
  return NextResponse.json({ success: true, role, redirectUrl: HOME_BY_ROLE[role] });
});
