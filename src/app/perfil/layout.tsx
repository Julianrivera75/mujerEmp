import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile, requireAcceptedTerms } from '@/lib/session-profile';
import LegalFooter from '@/components/LegalFooter';
import { UserProvider } from '@/lib/user-context';
import { ROLE_META } from '@/lib/roles';
import Navbar from '@/components/Navbar';

export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionProfile();
  if (!user) {
    redirect('/login');
  }
  requireAcceptedTerms(user);

  const variant = ROLE_META[user.role].variant;

  return (
    <div data-role={variant} className="flex min-h-dvh flex-col">
      <UserProvider user={user}>
        <div className="no-print">
          <Navbar user={user} />
        </div>
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <div className="no-print">
          <LegalFooter />
        </div>
      </UserProvider>
    </div>
  );
}
