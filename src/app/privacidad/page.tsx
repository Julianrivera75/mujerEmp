import type { Metadata } from 'next';
import { LegalDocument, LegalSection, LegalList } from '@/components/legal/LegalDocument';
import { CONTROLLER } from '@/lib/legal';

export const metadata: Metadata = { title: 'Política de tratamiento de datos personales | Empoderadas Diversas' };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de tratamiento de datos personales"
      intro="Esta política explica qué datos personales tratamos, para qué, con quién los compartimos y cómo puedes ejercer tus derechos, de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas aplicables en Colombia."
    >
      <LegalSection title="Alcance y marco legal">
        <p>
          Empoderadas Diversas tiene su sede en Miami, Florida (Estados Unidos) y sus participantes viven en varios
          países. Los derechos de acceso, corrección y eliminación de esta política se reconocen a todas las
          participantes, sin importar dónde residan. A las participantes que residen en Colombia se les aplican además
          la Ley 1581 de 2012 y sus decretos reglamentarios, que se citan más abajo.
        </p>
        <p>
          {
            '[Borrador: la Organización debe confirmar con asesoría legal las normas de Florida y de EE. UU. aplicables a sus datos (por ejemplo, la Ley de Protección de Información de Florida) y el trato de menores de 13 años (COPPA). La plataforma no está dirigida a menores de 13 años.]'
          }
        </p>
      </LegalSection>

      <LegalSection title="1. Responsable del tratamiento">
        <LegalList
          items={[
            <>Razón social: {CONTROLLER.legalName}</>,
            <>Registro (EIN): {CONTROLLER.taxId}</>,
            <>Domicilio: {CONTROLLER.address}</>,
            <>Correo para consultas y reclamos: {CONTROLLER.email}</>,
            <>Teléfono: {CONTROLLER.phone}</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Datos que tratamos">
        <LegalList
          items={[
            <>
              <strong>Identificación y contacto:</strong> nombre, número de estudiante, correo electrónico y número de
              contacto.
            </>,
            <>
              <strong>Cuenta:</strong> rol, estado, fechas de vinculación y contraseña (se guarda cifrada de forma
              irreversible; nadie puede verla).
            </>,
            <>
              <strong>Imagen y voz:</strong> foto de perfil y, cuando se graban las clases, tu imagen y tu voz.
            </>,
            <>
              <strong>Datos académicos:</strong> inscripciones, asistencia con fecha y hora, tareas entregadas,
              archivos, notas y retroalimentación.
            </>,
            <>
              <strong>Menores de edad:</strong> indicación de que la persona es menor y nombre y contacto de su
              representante legal, junto con la fecha de su autorización.
            </>,
            <>
              <strong>Registro de aceptación:</strong> fecha y versión de los términos y de esta política que aceptaste.
            </>,
            <>
              <strong>Datos técnicos:</strong> una cookie de sesión necesaria para mantenerte conectada y los registros
              de servidor que genera el proveedor de alojamiento (por ejemplo, dirección IP).
            </>,
          ]}
        />
        <p>
          La Plataforma no solicita datos sensibles (los que afectan la intimidad o cuyo uso indebido puede generar
          discriminación, como origen étnico, orientación sexual, salud o convicciones). Su suministro es siempre
          facultativo. Te pedimos no incluirlos en tus entregas ni en los campos de texto libre.{' '}
          {'[La Organización debe confirmar que no recolecta datos sensibles por otros medios.]'}
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidades">
        <LegalList
          items={[
            'Crear y administrar tu cuenta y verificar tu identidad al ingresar.',
            'Prestar el servicio de formación: inscribirte en clases, registrar tu asistencia, recibir y calificar tus tareas y darte retroalimentación.',
            'Publicar grabaciones de las clases para consulta de las participantes del programa.',
            'Expedir certificados de participación por módulo.',
            'Enviarte comunicaciones necesarias sobre el servicio (accesos, vigencia, cambios en los términos).',
            'Garantizar la seguridad de la Plataforma, prevenir fraudes y atender requerimientos de autoridades.',
            'Elaborar estadísticas e informes de impacto con datos agregados o anonimizados, que no permiten identificarte.',
          ]}
        />
        <p>No usamos tus datos para publicidad de terceros ni los vendemos.</p>
      </LegalSection>

      <LegalSection title="4. Autorización">
        <p>
          Tratamos tus datos con tu autorización previa, expresa e informada. La otorgas al aceptar esta política en tu
          primer ingreso a la Plataforma; guardamos la fecha y la versión aceptadas como prueba. Puedes revocarla en
          cualquier momento, salvo cuando exista un deber legal o contractual de conservar los datos.
        </p>
      </LegalSection>

      <LegalSection title="5. Menores de edad">
        <p>
          Solo tratamos datos de menores de 18 años cuando responde a su interés superior, se aseguran sus derechos
          fundamentales y contamos con la autorización de su madre, padre o representante legal (artículo 7 de la Ley
          1581 de 2012 y artículo 12 del Decreto 1377 de 2013). Sin esa autorización registrada, la cuenta de una
          persona menor no se habilita. El representante legal puede ejercer en su nombre todos los derechos descritos
          en el numeral 6.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>Como titular de los datos tienes derecho a:</p>
        <LegalList
          items={[
            'Conocer, actualizar y rectificar tus datos.',
            'Solicitar prueba de la autorización que otorgaste.',
            'Ser informada sobre el uso que se ha dado a tus datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.',
            'Revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios, derechos y garantías, o cuando ya no sean necesarios.',
            'Acceder de forma gratuita a tus datos personales.',
          ]}
        />
        <p>
          Puedes descargar una copia de tus datos y actualizar tu teléfono y tu foto desde la sección «Mi perfil». Para
          el resto de solicitudes, incluida la supresión, escríbenos a {CONTROLLER.email}. La supresión se hace
          anonimizando tu cuenta: eliminamos tus datos de identificación y tus archivos, y conservamos únicamente
          registros académicos que ya no te identifican.
        </p>
      </LegalSection>

      <LegalSection title="7. Cómo presentar consultas y reclamos">
        <LegalList
          items={[
            <>
              <strong>Consultas:</strong> las atendemos en un máximo de diez (10) días hábiles desde su recibo. Si no es
              posible, te informaremos el motivo y la nueva fecha, que no superará cinco (5) días hábiles adicionales.
            </>,
            <>
              <strong>Reclamos</strong> (rectificación, actualización o supresión): deben incluir tu identificación, la
              descripción de los hechos, tu dirección o correo de respuesta y los documentos que quieras hacer valer.
              Los resolvemos en un máximo de quince (15) días hábiles; si no es posible, te informaremos el motivo y la
              nueva fecha, que no superará ocho (8) días hábiles adicionales.
            </>,
            'Solo después de agotar este trámite ante la Organización puedes acudir a la Superintendencia de Industria y Comercio.',
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Con quién compartimos los datos">
        <p>
          Para prestar el servicio usamos proveedores que tratan datos en nuestro nombre (encargados), sujetos a sus
          propias condiciones de seguridad y privacidad:
        </p>
        <LegalList
          items={[
            'Alojamiento de la aplicación y de la base de datos: Railway Corporation (Estados Unidos).',
            'Almacenamiento de archivos (entregas, materiales y fotos): proveedor de almacenamiento de objetos compatible con S3 [PROVEEDOR Y PAÍS].',
            'Videollamadas y publicación de grabaciones: Google LLC (Google Meet y YouTube, Estados Unidos).',
          ]}
        />
        <p>
          Algunos de estos proveedores están fuera de Colombia, por lo que puede haber transmisión o transferencia
          internacional de datos. La Organización se asegura de que existan garantías adecuadas para ello, de
          conformidad con el artículo 26 de la Ley 1581 de 2012.{' '}
          {'[Validar con asesoría legal el fundamento aplicable a cada proveedor.]'}
          Fuera de esos casos, solo entregamos datos a autoridades que los requieran conforme a la ley.
        </p>
      </LegalSection>

      <LegalSection title="9. Seguridad">
        <LegalList
          items={[
            'Conexión cifrada (HTTPS) y contraseñas almacenadas con cifrado irreversible.',
            'Control de acceso por roles: cada persona ve solo la información que necesita.',
            'Archivos privados que se abren únicamente mediante enlaces firmados y temporales.',
            'Límite de intentos de ingreso y cabeceras de seguridad en el navegador.',
          ]}
        />
        <p>
          Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, lo gestionaremos y lo informaremos a
          la Superintendencia de Industria y Comercio y a las personas afectadas dentro de los plazos legales.
        </p>
      </LegalSection>

      <LegalSection title="10. Conservación">
        <p>
          Conservamos tus datos mientras dure tu vinculación y durante {'[PERIODO DE CONSERVACIÓN]'} después, para
          atender solicitudes sobre certificados y obligaciones legales. Vencido ese plazo, o cuando lo solicites y
          proceda, los suprimimos o anonimizamos.
        </p>
      </LegalSection>

      <LegalSection title="11. Registro de bases de datos (Colombia)">
        <p>
          {
            '[La Organización debe confirmar si está obligada a inscribir sus bases de datos en el Registro Nacional de Bases de Datos de la SIC y, de ser así, indicar aquí el estado de la inscripción.]'
          }
        </p>
      </LegalSection>

      <LegalSection title="12. Cookies">
        <p>
          Usamos únicamente una cookie técnica de sesión, necesaria para el funcionamiento de la Plataforma. Más
          detalles en la página de Cookies.
        </p>
      </LegalSection>

      <LegalSection title="13. Cambios en esta política">
        <p>
          Si modificamos esta política de forma sustancial, te lo informaremos en la Plataforma y te pediremos aceptar
          la nueva versión. La versión vigente y su fecha aparecen al inicio de este documento.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
