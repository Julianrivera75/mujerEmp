# 💜 Empoderas Diversas - Plataforma de Capacitación y Mentoría Virtual

Plataforma educativa moderna con diseño intuitivo, llamativo y animado, desarrollada para la gestión integral de programas de formación comunitaria, clases virtuales con Google Meet, registro automático de asistencia al clic, repositorio audiovisual en YouTube y módulo de entrega y calificación de tareas con retroalimentación personalizada.

---

## 👥 Roles del Sistema y Funcionalidades

### 1. 👑 Administrador (Acceso: `admin@empoderas.org` / `123456`)
- **Gestión de Usuarios**:
  - Crear usuarios de tipo **Estudiante** y **Mentor(a)**.
  - Asignar datos de perfil (Documento, Teléfono, Correo).
  - **Control de Estado**: Marcar usuarios como **ACTIVO** o **INACTIVO** con un clic (los inactivos tienen el acceso denegado).
  - **Fechas de Vigencia**: Asignar **Fecha de inicio** y **Fecha de finalización** del periodo formativo.
- **Programación Mensual de Clases**:
  - Filtrado y programación de clases por mes (ej. Septiembre 2026, Octubre 2026).
  - Asignación de mentora responsable y selección de estudiantes convocadas.
  - Configuración del enlace de **Google Meet**.
  - Carga del enlace de **YouTube** de la clase grabada con notas explicativas para los estudiantes.
- **Reporte Global de Asistencias**:
  - Matriz con porcentaje de asistencia por estudiante.
  - Log en tiempo real de fecha y hora exacta en que cada alumna dio clic para ingresar a Google Meet.

---

### 2. 👩‍🏫 Mentor(a) (Acceso: `carolina.mentor@empoderas.org` / `123456`)
- **Mis Clases & Horarios**:
  - Vista clara del cronograma y clases programadas por la administración.
  - Consulta de estudiantes asignadas a cada sesión.
- **Publicación de Enlaces de Clase**:
  - Publicar o actualizar el enlace de **Google Meet** de la sesión en vivo.
  - Cargar o modificar el enlace de **YouTube** para la clase grabada y materiales complementarios.
- **Monitoreo de Asistencia**:
  - Ver en tiempo real la lista de alumnas presentes que hicieron clic para unirse.
- **Tareas & Calificaciones**:
  - Crear nuevas tareas y consignas académicas con fecha límite.
  - Revisar entregas de las alumnas (enlaces, reflexiones, archivos).
  - Asignar calificación (escala 1.0 a 5.0) y redactar comentarios de **retroalimentación constructiva**.

---

### 3. 🎓 Estudiante (Acceso: `sofia.estudiante@empoderas.org` / `123456`)
- **Dashboard & Horarios**:
  - Vista de próximas clases virtuales y clases ya cursadas.
- **Asistencia Automática a Google Meet**:
  - Botón interactivo: **"Unirme a Clase en Google Meet"**.
  - Cada vez que la estudiante hace clic sobre este botón, **la plataforma registra automáticamente su asistencia** con fecha y hora exacta antes de abrir Google Meet.
  - Animación de celebración con confeti.
- **Repositorio de Clases Grabadas en YouTube**:
  - Sección para ver las grabaciones de las clases dictadas con reproductor interactivo embebido de YouTube.
  - Descarga de guías y materiales de apoyo.
- **Mis Tareas & Notas**:
  - Ver tareas pendientes, entregadas y calificadas.
  - Subir entregas con enlaces (Drive, Docs, etc.) y notas de reflexión.
  - Visualizar la calificación asignada y los **comentarios de retroalimentación de la mentora**.
- **Mi Historial de Asistencias**:
  - Registro transparente de asistencias confirmadas y porcentaje de participación.

---

## 🔑 Credenciales de Demostración (Contraseña para todos: `123456`)

| Rol | Correo Electrónico | Contraseña | Nota |
| :--- | :--- | :--- | :--- |
| **👑 Administrador** | `admin@empoderas.org` | `123456` | Control total del sistema |
| **👩‍🏫 Mentora 1** | `carolina.mentor@empoderas.org` | `123456` | Módulo de Liderazgo |
| **👩‍🏫 Mentora 2** | `valeria.mentor@empoderas.org` | `123456` | Módulo de Proyectos |
| **🎓 Estudiante 1** | `sofia.estudiante@empoderas.org` | `123456` | Alumna activa con notas |
| **🎓 Estudiante 2** | `lucia.estudiante@empoderas.org` | `123456` | Alumna activa |
| **⛔ Estudiante Inactiva** | `inactiva@empoderas.org` | `123456` | Prueba de bloqueo por inactividad |

> *Nota: En la pantalla de inicio de sesión (`/login`) encontrarás botones rápidos para llenar estas credenciales con un solo clic.*

---

## 🚀 Cómo Iniciar la Plataforma en Local

1. Instalar dependencias (ya instaladas):
   ```bash
   npm install
   ```

2. Inicializar la base de datos con datos de prueba:
   ```bash
   npm run prisma:push
   npm run prisma:seed
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en tu navegador:
   ```
   http://localhost:3000
   ```
