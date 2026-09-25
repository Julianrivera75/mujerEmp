# Empoderadas Diversas

Plataforma web de capacitación y mentoría virtual. Gestiona clases en vivo por Google Meet con registro automático de asistencia, repositorio de grabaciones de YouTube, materiales de clase, tareas con entrega y calificación, y constancias de participación.

## Roles

| Rol            | Qué hace                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Administradora | Crea y gestiona usuarias, programa clases, asigna mentoras e inscribe estudiantes, consulta y exporta asistencias, anonimiza cuentas. |
| Mentora        | Ve sus clases, publica el enlace de Meet y de la grabación, sube materiales, crea tareas y califica entregas.                         |
| Estudiante     | Ingresa a sus clases (la asistencia se registra al entrar), ve grabaciones y materiales, entrega tareas y descarga su constancia.     |

## Stack

- Next.js 15 (App Router) y React 19
- Tailwind CSS, Framer Motion y lucide-react
- Prisma 5 con PostgreSQL
- Almacenamiento de archivos compatible con S3 (URLs firmadas)
- Despliegue en Railway

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior
- Un bucket compatible con S3 (solo si se usan archivos)

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores.

| Variable                                                                    | Obligatoria         | Descripción                                                                   |
| --------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                              | Sí                  | Cadena de conexión de PostgreSQL.                                             |
| `JWT_SECRET`                                                                | Sí en producción    | Secreto largo y aleatorio para firmar la sesión.                              |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | Para subir archivos | Credenciales del almacenamiento. `S3_REGION` es opcional.                     |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN`                                               | No                  | Con `true` muestra los accesos rápidos de demostración. Solo para desarrollo. |

## Puesta en marcha local

```bash
npm install
cp .env.example .env
npm run prisma:migrate:deploy
npm run prisma:seed   # solo local: borra todos los datos y crea cuentas de prueba
npm run dev
```

La aplicación queda en http://localhost:3000. El script `prisma/seed.js` se bloquea si `NODE_ENV=production`.

## Scripts

| Comando                         | Uso                                                             |
| ------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                   | Servidor de desarrollo.                                         |
| `npm run build`                 | Genera el cliente de Prisma y compila para producción.          |
| `npm run start`                 | Sirve la compilación.                                           |
| `npm run prisma:migrate:deploy` | Aplica las migraciones pendientes.                              |
| `npm run prisma:generate`       | Regenera el cliente de Prisma.                                  |
| `npm run typecheck`             | Comprueba los tipos de TypeScript.                              |
| `npm run lint`                  | ESLint sin advertencias.                                        |
| `npm run format:check`          | Comprueba el formato con Prettier (`npm run format` lo aplica). |
| `npm run knip`                  | Detecta código y dependencias sin uso.                          |
| `npm run test`                  | Pruebas unitarias y de integración.                             |
| `npm run test:coverage`         | Pruebas con informe y umbral de cobertura.                      |
| `npm run check`                 | Todo lo anterior y la compilación, igual que el CI.             |

## Pruebas

Las pruebas de integración usan una base PostgreSQL propia, distinta de la de desarrollo. Se niegan a correr si el nombre de la base no contiene "test".

```bash
docker compose -f docker-compose.test.yml up -d
export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/empoderas_test?schema=public"
npm run test:coverage
```

En GitHub Actions el mismo conjunto corre en cada push con un servicio de PostgreSQL.

## Estructura

```
prisma/               Esquema, migraciones y datos de prueba
src/app/              Páginas y rutas de la API (App Router)
  admin/ mentor/ estudiante/ perfil/   Áreas por rol
  api/                                 Rutas de servidor
  terminos/ privacidad/ cookies/       Documentos legales públicos
src/components/       Componentes de interfaz (ui/, fx/, legal/)
src/lib/              Autenticación, validación, almacenamiento, utilidades
tests/                Pruebas unitarias (unit/) y de integración de la API (api/)
scripts/              Scripts de operación (auditoría de cuentas, importación de usuarias)
```

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md): capas, autenticación, permisos y modelo de datos.
- [Operación](docs/OPERACION.md): despliegue, migraciones, secretos e incidentes.
