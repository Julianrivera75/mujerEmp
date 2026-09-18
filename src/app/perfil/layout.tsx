import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session-profile';
import { UserProvider } from '@/lib/user-context';
import { ROLE_META } from '@/lib/roles';
import Navbar from '@/components/Navbar';

export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionProfile();
  if (!user) {
    redirect('/login');
  }

  const variant = ROLE_META[user.role].variant;

  return (
    <div data-role={variant} className="min-h-dvh flex flex-col">
      <UserProvider user={user}>
        <div className="no-print">
          <Navbar user={user} />
        </div>
        <main id="contenido" className="flex-1">
          {children}
        </main>
      </UserProvider>
    </div>
  );
}
