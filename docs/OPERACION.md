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

| Variable | Notas |
| --- | --- |
| `DATABASE_URL` | La inyecta Railway al enlazar PostgreSQL. |
| `JWT_SECRET` | Obligatoria en producción: sin ella la aplicación no compila ni arranca. |
| `S3_*` | Credenciales del bucket. |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | Dejar sin definir en producción. Es una variable de compilación. |

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
