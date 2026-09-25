import type { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';
import { Table, TCell, THead, TRow } from '@/components/ui/Table';

export const metadata: Metadata = { title: 'Política de cookies | Empoderadas Diversas' };

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Política de cookies"
      intro="Una cookie es un pequeño archivo que el sitio guarda en tu navegador. Esta plataforma usa la mínima cantidad necesaria."
    >
      <LegalSection title="Cookies que usamos">
        <Table caption="Cookies que usa la plataforma" className="text-xs">
          <THead>
            <tr>
              <TCell head>Nombre</TCell>
              <TCell head>Finalidad</TCell>
              <TCell head>Duración</TCell>
              <TCell head>Tipo</TCell>
            </tr>
          </THead>
          <tbody>
            <TRow>
              <TCell className="font-mono">__Host-empoderas_session</TCell>
              <TCell>Mantener tu sesión iniciada de forma segura.</TCell>
              <TCell>7 días</TCell>
              <TCell>Técnica, necesaria (propia)</TCell>
            </TRow>
          </tbody>
        </Table>
        <p>
          Es una cookie estrictamente necesaria: sin ella no podrías ingresar, por eso no requiere un consentimiento
          separado. No es accesible desde scripts del navegador y solo se envía por conexión segura.
        </p>
      </LegalSection>

      <LegalSection title="Lo que no usamos">
        <p>No usamos cookies de analítica, de publicidad ni de seguimiento propias.</p>
      </LegalSection>

      <LegalSection title="Contenido de terceros">
        <p>
          Las grabaciones de las clases se muestran con el reproductor de YouTube en su modo de privacidad ampliada. Aun
          así, al reproducir un video Google puede guardar cookies o información en tu navegador según sus propias
          políticas. Al abrir una sala de Google Meet también se aplican las condiciones de Google.
        </p>
      </LegalSection>

      <LegalSection title="Cómo gestionarlas">
        <p>
          Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas la cookie de sesión
          no podrás iniciar sesión en la Plataforma.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
