# Arquitectura

## Visión general

Aplicación Next.js 14 con App Router. Las páginas y la API viven en el mismo proyecto y comparten la base de datos PostgreSQL a través de Prisma. Los archivos (entregas, materiales y fotos) se guardan en un bucket compatible con S3 y se sirven con URLs firmadas y temporales.

```
Navegador ──► middleware (verifica sesión y rol)
                 ├─► páginas por rol (admin, mentor, estudiante, perfil)
                 └─► API  src/app/api/**  ──► Prisma ──► PostgreSQL
                                          └─► S3 (URLs firmadas)
```

## Capas

| Capa             | Ubicación                                             | Responsabilidad                                                                                                  |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Middleware       | `src/middleware.ts`                                   | Verifica la firma de la sesión, estado de la cuenta y separa las áreas por rol.                                  |
| Layouts por área | `src/app/{admin,mentor,estudiante,perfil}/layout.tsx` | Resuelven la usuaria, aplican el tema del rol, montan la barra de navegación y exigen la aceptación de términos. |
| Páginas          | `src/app/**/page.tsx`                                 | Interfaz. Consumen la API con `fetch`.                                                                           |
| API              | `src/app/api/**/route.ts`                             | Autorización por rol, validación de datos y acceso a la base.                                                    |
| Librerías        | `src/lib/`                                            | Autenticación, validadores, límite de intentos, almacenamiento, registro de errores.                             |
| Componentes      | `src/components/`                                     | Interfaz reutilizable (`ui/`), fondo animado (`fx/`) y documentos legales (`legal/`).                            |

## Autenticación y sesión

- Inicio de sesión con correo y contraseña (hash con bcrypt).
- La sesión es un JWT HS256 de 7 días en la cookie `empoderas_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción).
- El middleware verifica la firma y redirige según el rol. Cada llamada a la API vuelve a consultar a la usuaria en la base para confirmar que sigue activa.
- El inicio de sesión limita los intentos por cuenta y por dirección IP y responde igual si la cuenta no existe.
- Las cuentas tienen periodo de vigencia (`startDate`, `endDate`) y estado (`ACTIVO`, `INACTIVO`).

## Permisos por rol

| Recurso    | Administradora                     | Mentora                               | Estudiante                             |
| ---------- | ---------------------------------- | ------------------------------------- | -------------------------------------- |
| Usuarias   | Crear, editar, activar, anonimizar | Sin acceso                            | Solo su perfil                         |
| Clases     | Todas                              | Las que dicta (edita enlaces y notas) | Las que tiene inscritas (solo lectura) |
| Asistencia | Todas                              | De sus clases                         | Solo la propia                         |
| Tareas     | Todas                              | Las de sus clases                     | Las de sus clases inscritas            |
| Entregas   | Ver y calificar todas              | Ver y calificar las de sus clases     | Enviar y ver las propias               |
| Materiales | Todos                              | Crear y borrar en sus clases          | Ver los de sus clases                  |
| Archivos   | Todos                              | Los de sus clases y los propios       | Los propios y los materiales           |

## Modelo de datos

- **User**: rol, estado, vigencia, datos de contacto, aceptación de términos, datos de menor y su representante, marca de anonimización.
- **ClassSession**: título, fechas, enlace de Meet, enlace de YouTube, estado y mentora. Agrupada por `monthKey` (`AAAA-MM`).
- **ClassEnrollment**: inscripción de una estudiante en una clase (única por pareja).
- **Attendance**: asistencia con fecha y hora de ingreso (única por clase y estudiante).
- **Assignment**: tarea de una clase creada por una mentora.
- **Submission**: entrega de una estudiante con nota, retroalimentación y archivo (única por tarea y estudiante).
- **ClassResource**: material de una clase (enlace, video o archivo).

## Almacenamiento de archivos

Categorías en `src/lib/s3.ts`: `submission` (entregas), `resource` (materiales), `avatar` (fotos) y `certificate`. Cada una define prefijo, tamaño máximo y tipos permitidos.

1. El cliente pide una URL firmada de subida indicando tipo y tamaño.
2. Sube el archivo directo al bucket.
3. Al guardar el registro, la API comprueba que la clave sea de la usuaria y que el archivo exista con el tipo y tamaño permitidos; si no, lo elimina.
4. Para leerlo se pide una URL firmada de corta duración, sujeta a los permisos de la tabla anterior.

## Seguridad aplicada

- Validación de roles, estados, fechas y enlaces en el servidor. Los enlaces aceptan solo `https`; Meet y YouTube, solo sus dominios.
- Cabeceras de seguridad definidas en `next.config.mjs`.
- Cada rol recibe únicamente los datos personales que necesita.
- Registro de errores sin volcar datos personales (`src/lib/log.ts`).

## Datos personales y consentimiento

- Páginas públicas `/terminos`, `/privacidad` y `/cookies`.
- Pantalla de aceptación (`/aceptar-terminos`) que guarda fecha y versión. Se activa con `LEGAL_REVIEW_COMPLETED` en `src/lib/legal.ts`. Al cambiar los textos se sube `CURRENT_TERMS_VERSION` para pedir una nueva aceptación.
- Menores de edad: no acceden sin la autorización registrada de su representante (cuando el consentimiento está activo).
- Derechos de la titular: descarga de datos desde Mi perfil y anonimización de cuentas desde el panel de administración.

## Tema visual

El color de cada área lo define el atributo `data-role` del layout (`admin`, `mentor`, `student`, `brand`) mediante variables CSS `--role-*` en `src/app/globals.css`, expuestas en Tailwind como `role-from`, `role-to`, `role-accent` y `role-soft`. Una administradora ve cada área con el color de esa área, no con el de su rol.
