import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session-profile';
import { UserProvider } from '@/lib/user-context';
import Navbar from '@/components/Navbar';

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionProfile();
  if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  return (
    <div data-role="mentor" className="min-h-dvh flex flex-col">
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
