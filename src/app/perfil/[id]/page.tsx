import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session-profile';
import PersonProfile from './PersonProfile';

export const dynamic = 'force-dynamic';

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionProfile();
  // El perfil propio se edita en /perfil.
  if (user && user.id === id) redirect('/perfil');
  return <PersonProfile personId={id} />;
}
