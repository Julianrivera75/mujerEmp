import { redirect } from 'next/navigation';
import { HOME_BY_ROLE } from '@/lib/roles';
import { getSessionProfile } from '@/lib/session-profile';
import ChangePasswordForm from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await getSessionProfile();
  if (!user) redirect('/login');
  // Quien ya cambió su contraseña no vuelve a ver esta pantalla.
  if (!user.mustChangePassword) redirect(HOME_BY_ROLE[user.role]);

  return <ChangePasswordForm userName={user.name} email={user.email} homeHref={HOME_BY_ROLE[user.role]} />;
}
