import type { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';

export const metadata: Metadata = { title: 'Política de cookies | Empoderas Diversas' };

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Política de cookies"
      intro="Una cookie es un pequeño archivo que el sitio guarda en tu navegador. Esta plataforma usa la mínima cantidad necesaria."
    >
      <LegalSection title="Cookies que usamos">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-bold">Nombre</th>
                <th className="px-3 py-2 font-bold">Finalidad</th>
                <th className="px-3 py-2 font-bold">Duración</th>
                <th className="px-3 py-2 font-bold">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">empoderas_session</td>
                <td className="px-3 py-2">Mantener tu sesión iniciada de forma segura.</td>
                <td className="px-3 py-2">7 días</td>
                <td className="px-3 py-2">Técnica, necesaria (propia)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Es una cookie estrictamente necesaria: sin ella no podrías ingresar, por eso no requiere un consentimiento separado. No es accesible desde scripts del navegador y solo se envía por conexión segura.
        </p>
      </LegalSection>

      <LegalSection title="Lo que no usamos">
        <p>No usamos cookies de analítica, de publicidad ni de seguimiento propias.</p>
      </LegalSection>

      <LegalSection title="Contenido de terceros">
        <p>
          Las grabaciones de las clases se muestran con el reproductor de YouTube en su modo de privacidad ampliada. Aun así, al reproducir un video Google puede guardar cookies o información en tu navegador según sus propias políticas.
          Al abrir una sala de Google Meet también se aplican las condiciones de Google.
        </p>
      </LegalSection>

      <LegalSection title="Cómo gestionarlas">
        <p>
          Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas la cookie de sesión no podrás iniciar sesión en la Plataforma.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
