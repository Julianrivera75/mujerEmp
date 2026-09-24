import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session-profile';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import AcceptTermsForm from './AcceptTermsForm';

export const dynamic = 'force-dynamic';

export default async function AcceptTermsPage() {
  const user = await getSessionProfile();
  if (!user) redirect('/login');

  const blockedMinor = Boolean(user.isMinor && !user.guardianConsentAt);
  const alreadyAccepted = user.termsVersion === CURRENT_TERMS_VERSION && !blockedMinor;
  const homeHref = user.role === 'ADMIN' ? '/admin' : user.role === 'MENTOR' ? '/mentor' : '/estudiante';

  if (alreadyAccepted) redirect(homeHref);

  return <AcceptTermsForm userName={user.name} version={CURRENT_TERMS_VERSION} blockedMinor={blockedMinor} homeHref={homeHref} />;
}
