# Deuda técnica — Empoderas Diversas

Revisión exhaustiva de frontend, backend y base de datos. Priorizado para planificación del equipo.

---

## 🔴 Crítico

### Seguridad

- [ ] **Middleware no verifica firma JWT** (`src/middleware.ts:28-67`) — solo decodifica el payload con `atob()`, sin `jwt.verify`. Se puede fabricar una cookie falsa y navegar a rutas de admin del lado cliente. Las API sí verifican bien (`jsonwebtoken.verify`), el middleware de páginas no. Usar `jose` (compatible con Edge runtime) para validar firma real.
- [ ] **Confirmar si `/api/admin/attendances` filtra por rol server-side.** `estudiante/asistencias` y `mentor/asistencias` (frontend) pegan a este endpoint "admin" y filtran client-side. Si el backend no reduce el payload antes de responder, es fuga de PII (nombres, emails, documento) de todas las estudiantes a cualquier estudiante/mentor logueado. **Investigar primero, antes que nada más.**
- [ ] **IDOR: mentor puede calificar entregas de clases ajenas** — `src/app/api/submissions/route.ts:50-82` no valida `submission.assignment.classSession.mentorId === user.id`.
- [ ] **IDOR: mentor puede crear tareas en clases ajenas** — `src/app/api/assignments/route.ts:50-82` no valida pertenencia de `classId` al mentor.
- [ ] **`admin/attendances` GET expone resumen de todas las estudiantes a cualquier mentor** — `src/app/api/admin/attendances/route.ts:46-60`, el bloque `studentSummary` no filtra por mentor.
- [ ] **`attendance/mark` no valida inscripción** — cualquier estudiante autenticado marca asistencia en clases donde no está inscrita (`src/app/api/attendance/mark/route.ts:26-44`).
- [ ] **Admin puede autodegradarse/banearse sin protección** — `src/app/api/admin/users/route.ts:114-157`, sin chequeo de "no te edites/elimines a vos mismo", ni de "no dejar el sistema sin ningún admin activo".

### Base de datos

- [ ] **`role`/`status` como `String` libre, no `enum`** (`prisma/schema.prisma:15,16,41`). Typos rompen comparaciones silenciosamente. Ahora que es Postgres no hay limitación técnica para usar `enum Role`, `enum UserStatus`, `enum ClassStatus`.
- [ ] **Sin índices en foreign keys** — Postgres no los crea automático al declarar FK (a diferencia de MySQL). Faltan: `@@index([mentorId])` en ClassSession, `@@index([classId])`/`@@index([creatorId])` en Assignment, `@@index([classId])` en ClassResource, `@@index([studentId])` en ClassEnrollment/Attendance/Submission. Crítico antes de escalar — con 1000+ usuarios cada query hace seq scan.
- [ ] **Sin paginación en el modelo ni en las queries** — riesgo real con 10000+ registros de asistencia. Agregar `@@index([joinedAt])` o `@@index([classId, joinedAt])` y usar cursor-based pagination de Prisma.

### Frontend

- [ ] **Cero `loading.tsx`/`error.tsx`/`not-found.tsx`** en todo `src/app/` — errores de red o render dejan la página en blanco sin feedback al usuario.
- [ ] **Patrón `fetch('/api/auth/me')` duplicado en 11+ páginas**, cada una con su propio spinner manual (`useState`), sin SWR/React Query, sin layout compartido por rol (`admin/layout.tsx`, `mentor/layout.tsx`, `estudiante/layout.tsx` no existen). Es la deuda técnica más grande del frontend — mayor ROI de arreglo.

---

## 🟡 Importante

### Backend
- [ ] Sin validación de esquema (Zod u otra) en ningún endpoint — todos los `req.json()` se castean con `as string`/`any` directo a Prisma.
- [ ] Errores de Prisma siempre devuelven 500 genérico — sin diferenciar `P2025` (not found → 404) ni `P2002` (unique constraint → 409).
- [ ] `submissions POST` no valida `dueDate` — no bloquea ni marca como tardía una entrega vencida.
- [ ] Sin paginación en ningún listado de API (`admin/users`, `classes`, `assignments`, `admin/attendances`).
- [ ] `classes GET` sobre-expone datos: trae emails/documentId de todas las compañeras inscritas incluso cuando responde a un STUDENT.
- [ ] Duplicación de lógica de autorización (`getCurrentUser()` + chequeo de rol) copiada en los 11 endpoints, sin helper `requireRole()`.
- [ ] Sin rate limiting en `/api/auth/login` — vulnerable a fuerza bruta.
- [ ] JWT expira en 7 días sin refresh token ni invalidación server-side (no hay tabla de sesiones/blacklist).
- [ ] Formato de respuesta JSON inconsistente entre endpoints (`{success, message, user}` vs `{user}` vs `{classes}` sin wrapper).

### Base de datos
- [ ] `onDelete: Cascade` desde `User` (mentor/creator) hacia ClassSession/Assignment — borrar un mentor destruye en cascada historial de notas/asistencia de estudiantes ajenas. Debería ser `Restrict` (o forzar reasignación/soft-delete).
- [ ] `grade` como `Float` en vez de `Decimal` — riesgo de error de redondeo binario en notas.
- [ ] `documentId` sin `@unique` — posible duplicado de identidad de estudiante/mentor.
- [ ] Sin índice en `monthKey`/`dateStart` de ClassSession, usados para filtrar dashboards mensuales.
- [ ] `ClassEnrollment` sin `createdAt` — no se puede auditar cuándo se inscribió alguien.

### Frontend
- [ ] Sin confirmación en acciones destructivas salvo borrar clase (desactivar usuario, cambiar rol de golpe sin aviso).
- [ ] Estado optimista sin rollback visible en error — el usuario hace clic y no sabe si falló.
- [ ] `alert()`/`confirm()` nativos del navegador rompiendo la estética "glass-card" del resto de la app.
- [ ] Duplicación masiva de UI entre las 3 vistas de rol: tabla de asistencia (x3), modal genérico (x6+), badge de estado (x4), botón de submit con loader (x7+), formateo de fecha en español (repetido en casi cada archivo) — sin componentes compartidos (`<Modal>`, `<AttendanceTable>`, `<StatusBadge>`, `<SubmitButton>`).
- [ ] Sin validación client-side más allá de `required`/`type` — no valida que `dateEnd` > `dateStart`, ni fortaleza real de contraseña, ni que `meetLink`/`youtubeUrl` sean URLs válidas de esos servicios.
- [ ] `useState<any>` para el usuario logueado en 11 páginas — sin tipo `CurrentUser` compartido en `src/types`.
- [ ] Falta UI de admin/mentor para crear `ClassResource` — el modelo ya lo soporta, solo se consume del lado estudiante.

---

## 🟢 Menor

- [ ] Accesibilidad: botones icon-only sin `aria-label` (solo `title`), `<label>` sin `htmlFor`/`id` asociado, modales sin focus trap ni cierre con `Escape`, tablas sin `<caption>`/`scope="col"`.
- [ ] `framer-motion` en dependencies sin uso detectado en el código revisado — auditar si se usa en algún lado o eliminar.
- [ ] `admin/page.tsx` trae arrays completos de `attendances`/`enrollments` solo para contar `.length` — usar `_count` de Prisma.
- [ ] `console.error` como único manejo de error en todos los `catch` — sin logging/monitoring real.
- [ ] Convención REST inconsistente: `admin/users/toggle-status` (POST) vs PUT genérico que podría manejar lo mismo.
- [ ] `src/lib/prisma.ts` exporta `prisma` y `default` a la vez — limpiar.
- [ ] Enums de menor impacto: `ClassResource.type`, `Submission.fileType` (metadata de presentación, no crítico).

---

## 📎 Pendiente de planear (no relevado aún, mencionado por el usuario)

- [ ] **Storage de archivos (PDFs, imágenes)** — no hay bucket S3/R2 ni disco persistente configurado todavía. Necesario para certificados, entregas de tareas con adjuntos, recursos de clase. Evaluar Railway Volume vs bucket externo (Cloudflare R2, S3) según necesidad de acceso público/privado y tamaño esperado.
- [ ] **Entorno de staging/preview** — hoy todo push a `main` despliega directo a producción (CI/CD ya funciona, confirmado). Si se quiere probar antes de que usuarias reales vean cambios, armar un segundo environment en Railway.

---

## Orden de trabajo recomendado

1. Confirmar y cerrar la fuga de datos de asistencia (`admin/attendances`).
2. Arreglar verificación de firma JWT en middleware.
3. Cerrar los IDOR de `submissions`/`assignments`.
4. Resto: mejora incremental según prioridad del equipo.
