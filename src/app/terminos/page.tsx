import type { Metadata } from 'next';
import { LegalDocument, LegalSection, LegalList } from '@/components/legal/LegalDocument';
import { CONTROLLER, CERTIFICATE_MIN_ATTENDANCE_PERCENT } from '@/lib/legal';

export const metadata: Metadata = { title: 'Términos y condiciones | Empoderas Diversas' };

export default function TermsPage() {
  return (
    <LegalDocument
      title="Términos y condiciones de uso"
      intro="Estos términos regulan el acceso y el uso de la plataforma de capacitación y mentoría de Empoderas Diversas. Léelos con atención: al aceptarlos te comprometes a cumplirlos."
    >
      <LegalSection title="1. Quiénes somos">
        <p>
          La plataforma es operada por {CONTROLLER.legalName}, identificada con NIT {CONTROLLER.taxId}, con domicilio en{' '}
          {CONTROLLER.address} (en adelante, «la Organización»). Puedes escribirnos a {CONTROLLER.email}.
        </p>
      </LegalSection>

      <LegalSection title="2. Definiciones">
        <LegalList
          items={[
            <>
              <strong>Plataforma:</strong> el sitio web y los servicios asociados de gestión de clases virtuales,
              asistencia, tareas, materiales y constancias.
            </>,
            <>
              <strong>Usuaria:</strong> toda persona con una cuenta activa, ya sea estudiante, mentora o administradora.
            </>,
            <>
              <strong>Estudiante:</strong> persona inscrita en las clases del programa de formación.
            </>,
            <>
              <strong>Mentora:</strong> persona que dicta clases, asigna tareas y retroalimenta a las estudiantes.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Naturaleza del servicio">
        <p>
          El programa es una actividad de formación complementaria. La participación en él, y la constancia que la
          Plataforma genera,{' '}
          <strong>
            no constituyen título académico, ni certificación de educación formal, ni certificación de competencias
            laborales
          </strong>{' '}
          reconocida oficialmente, salvo que la Organización lo indique de forma expresa y por escrito.
        </p>
      </LegalSection>

      <LegalSection title="4. Cuentas y seguridad">
        <LegalList
          items={[
            'Las cuentas son creadas por la administración de la Organización y son personales e intransferibles.',
            'Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad realizada con tu cuenta. Avísanos de inmediato si sospechas un uso no autorizado.',
            'Tu acceso está limitado al periodo de vinculación que la Organización haya definido para ti.',
            'La Organización puede suspender o desactivar una cuenta por incumplimiento de estos términos, por fin de la vinculación o por razones de seguridad.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Personas menores de edad">
        <p>
          Las personas menores de 18 años solo pueden usar la Plataforma si su madre, padre o representante legal ha
          dado su autorización previa, expresa e informada, que la Organización registra antes de habilitar el acceso.
          El tratamiento de los datos de menores se rige por la Política de tratamiento de datos personales y por el
          interés superior del menor.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso adecuado">
        <p>Al usar la Plataforma te comprometes a:</p>
        <LegalList
          items={[
            'Tratar con respeto a las demás personas. No se toleran el acoso, la discriminación, las amenazas ni el lenguaje ofensivo.',
            'No compartir con terceros los enlaces de las clases ni los materiales de acceso restringido.',
            'No suplantar a otra persona ni entregar trabajos que no sean tuyos sin indicar su fuente.',
            'No subir contenido ilícito, con virus, que vulnere derechos de terceros o que contenga datos personales de otras personas sin su autorización.',
            'No intentar acceder sin autorización a cuentas, datos o sistemas, ni interferir con el funcionamiento de la Plataforma.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Clases virtuales y grabaciones">
        <p>
          Las clases se realizan por videollamada mediante servicios de terceros (por ejemplo, Google Meet). Algunas
          sesiones pueden ser grabadas y publicadas en un canal de YouTube, para que las participantes del programa
          puedan repasarlas. La grabación puede captar tu imagen, tu voz y tus intervenciones.
        </p>
        <p>
          Al aceptar estos términos autorizas de forma expresa esa grabación y su uso con fines pedagógicos dentro del
          programa. Puedes mantener tu cámara apagada. Si quieres que una grabación en la que apareces deje de estar
          disponible, escríbenos a {CONTROLLER.email} y la retiraremos en un plazo razonable.
        </p>
      </LegalSection>

      <LegalSection title="8. Propiedad intelectual">
        <LegalList
          items={[
            'Los materiales, marcas, textos y diseños de la Plataforma pertenecen a la Organización o a quienes los han licenciado. Se ponen a tu disposición para tu uso personal y no comercial.',
            'Los trabajos que entregas siguen siendo tuyos. Nos otorgas una licencia limitada, no exclusiva, para almacenarlos, revisarlos y evaluarlos dentro del programa. No los usaremos con fines de difusión o publicidad sin tu autorización adicional.',
            'Si consideras que un contenido infringe tus derechos, avísanos a través del correo indicado en el numeral 1.',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Asistencia y constancia de participación">
        <p>
          La asistencia se registra cuando ingresas a la sala desde el botón de la Plataforma. La constancia de
          participación se habilita cuando tu asistencia registrada alcanza al menos el{' '}
          {CERTIFICATE_MIN_ATTENDANCE_PERCENT}% de las sesiones en vivo en las que estás inscrita. La Organización puede
          negar o revocar una constancia si comprueba información falsa o un uso fraudulento de la Plataforma.
        </p>
      </LegalSection>

      <LegalSection title="10. Disponibilidad y responsabilidad">
        <LegalList
          items={[
            'Hacemos lo posible por mantener la Plataforma disponible, pero puede haber interrupciones por mantenimiento o por fallas de proveedores externos (alojamiento, videollamadas, video). No garantizamos un funcionamiento ininterrumpido ni libre de errores.',
            'En la medida permitida por la ley, la Organización no responde por daños indirectos derivados del uso o de la imposibilidad de uso de la Plataforma, ni por el contenido de sitios de terceros enlazados.',
            'Nada de lo aquí dispuesto excluye la responsabilidad que la ley no permita excluir ni limita los derechos irrenunciables que te correspondan.',
          ]}
        />
      </LegalSection>

      <LegalSection title="11. Protección de datos personales">
        <p>
          El tratamiento de tus datos personales se rige por la Política de tratamiento de datos personales, disponible
          en la Plataforma, conforme a la Ley 1581 de 2012 y sus normas reglamentarias.
        </p>
      </LegalSection>

      <LegalSection title="12. Cambios en estos términos">
        <p>
          Podemos actualizar estos términos. Cuando el cambio sea relevante te lo informaremos en la Plataforma y te
          pediremos aceptar la nueva versión para seguir usándola. La versión vigente y su fecha aparecen al inicio de
          este documento.
        </p>
      </LegalSection>

      <LegalSection title="13. Ley aplicable y reclamaciones">
        <p>
          Estos términos se rigen por las leyes de la República de Colombia. Ante cualquier inconformidad, te invitamos
          a escribirnos primero a {CONTROLLER.email} para buscar una solución directa. Lo anterior no limita tu derecho
          de acudir a las autoridades competentes, como la Superintendencia de Industria y Comercio.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
