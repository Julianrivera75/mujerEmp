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
