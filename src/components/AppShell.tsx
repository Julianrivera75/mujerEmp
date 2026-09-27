import React from 'react';
import { redirect } from 'next/navigation';
import { ActivityProvider } from '@/components/ActivityProvider';
import LegalFooter from '@/components/LegalFooter';
import Navbar from '@/components/Navbar';
import { ROLE_META } from '@/lib/roles';
import { getSessionProfile, requireAcceptedTerms, requirePasswordChange } from '@/lib/session-profile';
import { UserProvider } from '@/lib/user-context';

/** Estructura común de las pantallas que no pertenecen a un solo rol (perfil, chat, notificaciones). */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionProfile();
  if (!user) redirect('/login');
  requirePasswordChange(user);
  requireAcceptedTerms(user);

  const variant = ROLE_META[user.role].variant;

  return (
    <div data-role={variant} className="flex min-h-dvh flex-col">
      <UserProvider user={user}>
        <ActivityProvider>
          <div className="no-print">
            <Navbar user={user} />
          </div>
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <div className="no-print">
            <LegalFooter />
          </div>
        </ActivityProvider>
      </UserProvider>
    </div>
  );
}
