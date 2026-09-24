import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile, requireAcceptedTerms } from '@/lib/session-profile';
import LegalFooter from '@/components/LegalFooter';
import { UserProvider } from '@/lib/user-context';
import Navbar from '@/components/Navbar';

export default async function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionProfile();
  if (!user || (user.role !== 'STUDENT' && user.role !== 'ADMIN')) {
    redirect('/login');
  }
  requireAcceptedTerms(user);

  return (
    <div data-role="student" className="flex min-h-dvh flex-col">
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
