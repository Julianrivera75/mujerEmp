# Operación

## Servicios en producción

Proyecto de Railway con tres piezas: el servicio de la aplicación, PostgreSQL y un bucket de almacenamiento. La aplicación se despliega automáticamente al hacer push a `main`.

El comando de arranque (`railway.json`) aplica las migraciones pendientes antes de iniciar:

```
npx prisma migrate deploy && npm run start
```

Si una migración falla, la aplicación no arranca. Por eso toda migración debe probarse antes fuera de producción.

## Variables de entorno

Se definen en el servicio de la aplicación. La lista completa está en el README.

| Variable                      | Notas                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                | La inyecta Railway al enlazar PostgreSQL.                                |
| `JWT_SECRET`                  | Obligatoria en producción: sin ella la aplicación no compila ni arranca. |
| `S3_*`                        | Credenciales del bucket.                                                 |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | Dejar sin definir en producción. Es una variable de compilación.         |

## Migraciones de base de datos

Reglas:

1. Solo hacia adelante. No se editan migraciones ya aplicadas.
2. En dos tiempos. Primero se agrega lo nuevo (columnas, tablas, índices) y el código sigue funcionando con ambas versiones; después, en otro despliegue, se retira lo viejo.
3. Antes de una migración que cambie datos existentes, hacer una copia de seguridad.
4. Probar la migración en una base con datos parecidos a los reales antes de producción.

Crear una migración en local:

```bash
npx prisma migrate dev --name descripcion_corta
```

## Cambiar dependencias

Desde Windows, después de `npm install` o `npm uninstall` hay que regenerar el lock en Linux con `npm run lock` (necesita Docker). Si no, `npm ci` falla en el CI y en Railway por dos paquetes opcionales de Linux que npm omite en Windows.

## Copias de seguridad y restauración

Copia manual de la base (requiere el CLI de Railway y `pg_dump`):

```bash
railway run pg_dump "$DATABASE_URL" --format=custom --file=respaldo.dump
```

Restauración sobre una base vacía:

```bash
pg_restore --clean --no-owner --dbname "$DATABASE_URL" respaldo.dump
```

Los archivos del bucket no forman parte de esa copia.

## Rotación de secretos

- `JWT_SECRET`: cambiarlo cierra todas las sesiones activas. Hacerlo si hay sospecha de filtración.
- Credenciales del bucket: generar unas nuevas en el proveedor, actualizar las variables `S3_*` y revocar las anteriores.

## Respuesta a incidentes

1. Contener: desactivar la cuenta afectada, rotar el secreto comprometido, pausar el servicio si hace falta.
2. Evaluar qué datos personales pudieron verse afectados y de quiénes.
3. Si hay datos personales comprometidos, informar a la Superintendencia de Industria y Comercio y a las personas afectadas dentro de los plazos legales.
4. Corregir la causa, dejar una prueba que la cubra y registrar lo ocurrido.

## Solicitudes de las titulares de datos

- Acceso: la propia persona descarga sus datos desde Mi perfil.
- Rectificación: teléfono y foto desde Mi perfil; nombre, correo y documento los corrige la administración.
- Supresión: la administración anonimiza la cuenta desde Usuarios. Se eliminan los datos de identificación y los archivos; se conservan registros académicos que ya no identifican a la persona.
- Plazos: consultas en 10 días hábiles y reclamos en 15 días hábiles.

## Certificados por módulo

Los cinco módulos de la cohorte se definen en `src/lib/modules.ts`: mes (`monthKey`, igual al de las clases), título, fecha de emisión que ya viene impresa en el arte y la posición del nombre y del número de estudiante sobre la imagen.

- Los artes están en `public/certificados/modulo-N.jpg` (1776 x 1296). La fecha y el resto del diseño son parte de la imagen; el sistema solo estampa el nombre completo y el número de estudiante, por eso la fecha no cambia según el día de descarga.
- El certificado de un módulo se habilita en los últimos 5 días del mes y exige el porcentaje mínimo de asistencia (`CERTIFICATE_MIN_ATTENDANCE_PERCENT` en `src/lib/legal.ts`, hoy 80 %) a las clases de ese mes en las que la estudiante está inscrita.
- La API `GET /api/certificates` calcula el estado; la página `/estudiante/certificado` compone la imagen en el navegador.
- Para cambiar un arte, reemplaza el archivo con el mismo nombre. Si el nuevo diseño mueve las líneas en blanco, ajusta las coordenadas del módulo y revisa el resultado con un nombre largo.
- El diploma final de graduación se gestiona aparte y no se sirve desde la plataforma.

## Logos

Los originales se guardan fuera del repositorio (`docs/imagenes/`, ignorada por git). `node scripts/optimize-logos.js` recorta los márgenes y genera las versiones ligeras en `public/logos/`. El logo oficial se muestra con `src/components/Logo.tsx` y los logos de las organizaciones aliadas con `src/components/PartnerLogos.tsx`.

## Número de estudiante y contraseñas iniciales

El campo `studentNumber` guarda el número de estudiante (la columna de la base de datos sigue llamándose `documentId`). Al crear una cuenta desde el panel, la contraseña inicial se propone como ese número sin guiones ni espacios. Cada persona debe cambiarla en su primer ingreso desde su perfil.

## Contraseñas iniciales y descarga de credenciales

Las contraseñas se guardan cifradas y no se pueden leer. El botón **Descargar usuarios con contraseña** (Usuarios) las restablece a su valor inicial y entrega un CSV una sola vez:

- Estudiantes: el número de estudiante sin guiones ni espacios (por ejemplo `044100526`).
- Mentores y quien no tenga número de estudiante: un número de 9 dígitos aleatorio.
- No incluye administradoras ni cuentas inactivas o anonimizadas; cierra las sesiones abiertas de las cuentas alcanzadas.

Reemplaza las contraseñas actuales: úsalo para la entrega inicial y comparte el archivo solo por un canal privado. Cada persona debe cambiar su contraseña desde su perfil en el primer ingreso.

## Cuentas con más de un rol

En Usuarios, además del rol principal se pueden marcar roles adicionales (por ejemplo, un mentor que también es estudiante). La persona ve en su menú "Cambiar a vista de ..." y trabaja con un rol a la vez; la vista activa se guarda en la cookie `__Host-empoderas_view` y se valida siempre contra los roles de la cuenta.

## Mes de las clases y zona horaria

El mes de una clase (`monthKey`) se calcula en la zona horaria de la organización, `America/New_York` (`src/lib/months.ts`), tanto en el servidor como en el navegador. Así una clase del 30 de septiembre a las 8 p. m. en Miami sigue perteneciendo a septiembre y a su módulo aunque en UTC ya sea octubre.

## Afiche de la clase

Cada clase puede tener una imagen (JPG, PNG o WebP de hasta 5 MB) que sube la administración o la mentora al programarla o editarla. Se guarda en el almacenamiento bajo `clases/<id de quien la sube>/` y se entrega con una URL firmada de 1 hora.

## Pasar el almacenamiento a Cloudflare R2

La plataforma usa cualquier almacenamiento compatible con S3; solo cambian las variables de entorno. Pasos:

1. En Cloudflare: R2 > crear bucket (por ejemplo `empoderadas-storage`) y un token de API con permiso de lectura y escritura solo sobre ese bucket. Anotar el ID de cuenta, la llave de acceso y la llave secreta.
2. En el servicio `app` de Railway, agregar las variables del destino: `DEST_S3_ENDPOINT` (`https://<ID_DE_CUENTA>.r2.cloudflarestorage.com`), `DEST_S3_BUCKET_NAME`, `DEST_S3_ACCESS_KEY_ID` y `DEST_S3_SECRET_ACCESS_KEY`.
3. Configurar el CORS del bucket nuevo, con las variables `S3_*` apuntando temporalmente al destino, o pegando la regla en el panel de R2 (Ajustes > CORS): orígenes `https://plataforma.empoderadasdiversas.com`, métodos `PUT, GET, HEAD`, encabezados `content-type`. También se puede aplicar con `node scripts/storage-cors.js https://plataforma.empoderadasdiversas.com --apply`.
4. Copiar los archivos existentes: `railway ssh --service app -- node scripts/copy-storage.js` (simulación) y luego con `--apply`. Se puede repetir; omite lo ya copiado.
5. Cambiar las variables `S3_ENDPOINT`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` a los valores de R2 (`S3_REGION=auto`) y borrar las `DEST_S3_*`. Railway redespliega solo.
6. Probar una subida real (foto en una entrega y afiche de una clase) y una descarga. Conservar el bucket anterior unos días antes de eliminarlo.

Las URLs firmadas usan estilo ruta (`forcePathStyle`), compatible con R2. Los archivos se sirven siempre con URLs firmadas de corta duración: los buckets deben quedar privados.

## Cambio obligatorio de contraseña

Toda contraseña que fija la administración (crear un usuario, escribir una nueva al editarlo, "Restablecer contraseña" por fila o la descarga masiva de credenciales) marca la cuenta con `mustChangePassword`. Mientras esté marcada:

- Al iniciar sesión, la persona llega a `/cambiar-contrasena` y no puede usar ninguna otra pantalla ni ruta de la API (responden 403 con `mustChangePassword: true`), salvo `auth/me` y `auth/profile`.
- Debe escribir la contraseña que le entregaron y una nueva (mínimo 8 caracteres y distinta de la anterior). Al guardar, la bandera se limpia, se renueva su sesión y no vuelve a aparecer.

La migración `must_change_password` marcó a todas las cuentas ya cargadas que no son administradoras. La contraseña la ve la administración una sola vez (al guardarla o restablecerla); no se guarda de forma legible.

## Tipos de cuenta

El formulario de usuarios ofrece: Estudiante, Mentor / Mentora, Mentor / Mentora y estudiante, y Administrador. El número de estudiante solo se pide y se muestra a las cuentas que son estudiantes (principal o adicional).

## Tareas y entregas

- La mentora de la clase (o la administración) puede editar el título, la descripción y la fecha límite de una tarea, y eliminarla. Eliminar borra también las entregas y los archivos subidos por las estudiantes.
- La estudiante puede modificar o quitar su entrega. Quitarla deja la tarea como no entregada y elimina su archivo. Una entrega calificada queda bloqueada: la mentora la reabre quitando la nota (calificación vacía).

## Perfil

Cada persona edita su nombre, correo, número de contacto, foto y contraseña. Cambiar el correo exige la contraseña actual. El nombre aparece en los certificados. El número de estudiante, el rol, el estado y las fechas de acceso solo los cambia la administración.

## Número de identificación por rol

Cada cuenta tiene un solo número editable (columna `documentId`, campo `memberNumber`). La etiqueta cambia con el rol: "Número de estudiante", "Número de mentor/a" o "Número de administrador/a" (`numberLabel` en `src/lib/labels.ts`). En una cuenta con dos roles se usa la etiqueta del rol activo. Cada persona lo edita en su perfil, también la administración.

## Presencia

Mientras la plataforma está abierta y visible, cada navegador envía un latido a `POST /api/activity` cada 30 segundos. Ese latido guarda `lastSeenAt`, genera los avisos de tareas por vencer de la estudiante y devuelve los contadores de la barra. Se muestra "En línea" si la última actividad fue hace menos de 2 minutos; después, "Activa hace N min", "Activa ayer" o la fecha. Quien oculta su estado (perfil) no lo muestra ni ve el de las demás; la administración siempre lo ve.

## Chat

Conversaciones uno a uno entre cualquier par de cuentas activas (`Conversation`, `Message`). Solo las dos personas leen la conversación (ni la administración). Reglas: mensajes de texto de hasta 2000 caracteres, límite de 30 por minuto por persona, no se escribe a cuentas inactivas o anonimizadas, y las cuentas de menores de edad solo conversan con mentores y con la administración. Al anonimizar una cuenta se eliminan sus conversaciones y avisos. La actualización es por consulta periódica (5 segundos con una conversación abierta, 30 segundos en general).

El directorio de "Nueva conversación" (`GET /api/chat/contacts`) pagina de 30 en 30, filtra por rol y solo muestra a quienes la persona puede escribir; no expone correo ni documento. "Mensaje a varias" (`POST /api/chat/broadcast`) está disponible para mentoras (a las estudiantes de sus clases) y para la administración (cualquier clase, todas las estudiantes, todas las mentoras o toda la comunidad). El servidor calcula los destinatarios, excluye cuentas inactivas, anonimizadas y las que la protección de menores no permite, y entrega el mismo texto en la conversación 1 a 1 de cada persona con quien lo envía, para que responda en privado. Tope de 500 personas por envío y 5 envíos por hora por persona.

## Notificaciones

Se generan al ocurrir el evento: tarea nueva (a las estudiantes inscritas), entrega recibida (a la mentora), tarea calificada (a la estudiante) y tarea por vencer en las próximas 48 horas (con el latido, una vez por tarea). Cada una guarda una ruta de destino; al pulsarla se marca como leída y se navega, cambiando de vista si la ruta pertenece a otro rol de la cuenta. Los mensajes sin leer del chat se muestran agrupados en la campana y como contador en la pestaña Chat.

## Avisos por correo (pendiente)

La preferencia "Recibir avisos por correo" ya se guarda por persona (`emailNotifications`), pero no se envía ningún correo. Para activarlos hace falta un servicio de envío (por ejemplo Resend o un SMTP), añadir su llave como variable de entorno y llamar al envío desde `notifyMany` (`src/lib/notifications.ts`) para quienes tengan la preferencia activa.

## Omitir el cambio de contraseña

En `/cambiar-contrasena` la persona puede pulsar "Omitir por ahora"; tras una confirmación con el aviso de seguridad, continúa a su panel sin cambiarla (`POST /api/auth/skip-password-change`, marca `pwdSkip` solo en la sesión actual). La cuenta sigue con `mustChangePassword = true` en la base de datos, así que en el siguiente ingreso se le vuelve a pedir. Cambiar la contraseña en cualquier momento limpia la marca para siempre.

## Ocupación y redes sociales

Cada persona puede describir a qué se dedica (`occupation`, hasta 160 caracteres) y enlazar sus redes (`socialLinks`, JSON con Instagram, LinkedIn, Facebook y un enlace libre). Cada enlace debe ser una URL `https://`; se valida en el servidor (`parseSocialLinks`, `src/lib/social-links.ts`). Se muestran en el perfil propio y en el perfil de cualquier otra persona, para facilitar la conexión entre ellas.

## Número de identificación con doble rol

El número (`memberNumber`) es uno solo por cuenta. Su etiqueta cambia según el rol con el que se esté viendo la plataforma en cada momento (`numberLabel(session.role)`): una persona que es mentora y estudiante ve "Número de mentor/a" en la vista de mentora y "Número de estudiante" en la vista de estudiante, pero es el mismo valor guardado.

## Correo visible en el perfil de otras personas

`GET /api/users/profile` ahora entrega el correo de cualquier persona a quien tenga sesión (antes solo a la administración), para facilitar el contacto directo. El número de contacto (WhatsApp) sigue reservado a la administración.

## Nota sobre datos de prueba

Mientras el programa no ha iniciado (nadie ha entrado todavía), se pueden crear cuentas y datos de prueba en producción para validar el chat, las notificaciones y estas funciones a fondo. Antes de que las 61 personas reales empiecen a usar la plataforma, hay que borrar esas cuentas y datos de prueba y dejar la base como estaba.
