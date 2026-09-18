import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { UserProvider } from '@/lib/user-context';
import Navbar from '@/components/Navbar';

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
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
