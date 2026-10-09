import { MAX_CLASS_IMAGES } from './class-images';
import { DELIVERY_TYPES } from './delivery';
import { z } from 'zod';
import {
  CLASS_STATUSES,
  MEET_HOSTS,
  RESOURCE_TYPES,
  ROLES,
  SUBMISSION_FILE_TYPES,
  USER_STATUSES,
  YOUTUBE_HOSTS,
  cleanText,
  isValidEmail,
  isValidPhone,
  parseDate,
  parseHttpsUrl,
  validatePassword,
} from '@/lib/validators';
import { extractYouTubeId } from '@/lib/youtube';

/** Texto obligatorio: se recorta y se limita el largo. */
const requiredText = (message: string, max: number) =>
  z
    .string({ error: message })
    .transform((v) => cleanText(v, max))
    .refine((v): v is string => v !== null, { message });

/** Texto opcional: vacío o ausente se guarda como null. */
const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => cleanText(v ?? '', max));

/** Número de contacto opcional; si se escribe debe parecer un teléfono internacional. */
const optionalPhone = z
  .string()
  .nullish()
  .transform((v) => cleanText(v ?? '', 30))
  .refine((v) => v === null || isValidPhone(v), {
    message: 'El número de contacto no es válido. Incluye el indicativo internacional, por ejemplo +1 305 555 0123.',
  });

const requiredId = (message: string) => z.string({ error: message }).min(1, message);

const dateField = (message: string) =>
  z
    .string({ error: message })
    .transform((v) => parseDate(v))
    .refine((v): v is Date => v !== null, { message });

const optionalDateField = z
  .string()
  .nullish()
  .transform((v) => parseDate(v ?? ''));

const password = z.string({ error: 'La contraseña es obligatoria.' }).superRefine((value, ctx) => {
  const message = validatePassword(value);
  if (message) ctx.addIssue({ code: 'custom', message });
});

const email = z
  .string({ error: 'El correo electrónico no es válido.' })
  .transform((v) => v.trim().toLowerCase())
  .refine(isValidEmail, { message: 'El correo electrónico no es válido.' });

/** Enlace opcional con dominios permitidos: vacío o ausente devuelve null; uno inválido es un error. */
function optionalLink(message: string, hosts: string[] | undefined, extra?: (url: string) => boolean) {
  return z
    .string()
    .nullish()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value.trim() === '') return null;
      const url = parseHttpsUrl(value, hosts);
      if (!url || (extra && !extra(url))) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return url;
    });
}

export const meetLink = optionalLink('El enlace de Meet debe ser una URL https de meet.google.com.', MEET_HOSTS);
export const youtubeLink = optionalLink(
  'El enlace de YouTube no es válido. Usa una URL https de un video de YouTube.',
  YOUTUBE_HOSTS,
  (url) => extractYouTubeId(url) !== null,
);

export const loginSchema = z.object({
  email: z
    .string({ error: 'Por favor, ingresa correo y contraseña.' })
    .min(1, 'Por favor, ingresa correo y contraseña.'),
  password: z
    .string({ error: 'Por favor, ingresa correo y contraseña.' })
    .min(1, 'Por favor, ingresa correo y contraseña.'),
});

export const acceptTermsSchema = z.object({ version: z.string({ error: 'Versión inválida.' }) });

export const profileSchema = z.object({
  name: requiredText('El nombre no puede estar vacío.', 120).optional(),
  email: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine(isValidEmail, { message: 'El correo electrónico no es válido.' })
    .optional(),
  phone: optionalPhone.optional(),
  memberNumber: optionalText(40).optional(),
  occupation: optionalText(160).optional(),
  socialLinks: z.record(z.string(), z.string()).nullish(),
  showOnlineStatus: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

const guardianFields = {
  isMinor: z.boolean().optional(),
  guardianName: z.string().nullish(),
  guardianContact: z.string().nullish(),
  guardianConsent: z.boolean().optional(),
};

const extraRoles = z
  .array(z.enum(ROLES, { error: 'Rol inválido.' }))
  .max(2)
  .optional();

export const switchRoleSchema = z.object({ role: z.enum(ROLES, { error: 'Rol inválido.' }) });

/** Un lote de cuentas cuya contraseña se restablece para entregar las credenciales. */
export const credentialsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Selecciona al menos una cuenta.').max(15, 'Máximo 15 cuentas por lote.'),
});

export const createUserSchema = z.object({
  name: requiredText('Nombre, email, contraseña y rol son obligatorios.', 120),
  email,
  password,
  role: z.enum(ROLES, { error: 'Rol inválido.' }),
  extraRoles,
  status: z.enum(USER_STATUSES, { error: 'Estado inválido.' }).optional(),
  memberNumber: optionalText(40),
  phone: optionalPhone,
  startDate: optionalDateField,
  endDate: optionalDateField,
  ...guardianFields,
});

export const updateUserSchema = z.object({
  id: requiredId('ID de usuario requerido.'),
  name: z.string().nullish(),
  email: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine(isValidEmail, { message: 'El correo electrónico no es válido.' })
    .optional(),
  password: z.string().nullish(),
  role: z.enum(ROLES, { error: 'Rol inválido.' }).optional(),
  extraRoles,
  status: z.enum(USER_STATUSES, { error: 'Estado inválido.' }).optional(),
  memberNumber: optionalText(40),
  phone: optionalPhone,
  startDate: optionalDateField,
  endDate: optionalDateField,
  ...guardianFields,
});

export const toggleStatusSchema = z.object({
  id: requiredId('Datos inválidos.'),
  status: z.enum(USER_STATUSES, { error: 'Datos inválidos.' }),
});

export const anonymizeSchema = z.object({ id: requiredId('ID de usuario requerido.') });

const classBase = {
  description: z.string().nullish(),
  recordingNotes: z.string().nullish(),
  status: z.enum(CLASS_STATUSES, { error: 'Estado de clase inválido.' }).optional(),
  meetLink: meetLink,
  youtubeUrl: youtubeLink,
  imageKey: z.string().max(300).nullish(),
  imageKeys: z
    .array(z.string().min(1).max(300))
    .max(MAX_CLASS_IMAGES, `Puedes subir hasta ${MAX_CLASS_IMAGES} fotos.`)
    .optional(),
};

export const createClassSchema = z.object({
  title: requiredText('Título, fecha inicio, fecha fin y mentor son obligatorios.', 200),
  dateStart: dateField('Título, fecha inicio, fecha fin y mentor son obligatorios.'),
  dateEnd: dateField('Título, fecha inicio, fecha fin y mentor son obligatorios.'),
  mentorId: requiredId('Título, fecha inicio, fecha fin y mentor son obligatorios.'),
  studentIds: z.array(z.string()).optional(),
  ...classBase,
});

/** En la edición los enlaces son opcionales: si no vienen, se conservan los actuales. */
export const updateClassSchema = z.object({
  id: requiredId('ID de clase requerido.'),
  title: z.string().nullish(),
  dateStart: z.string().nullish(),
  dateEnd: z.string().nullish(),
  mentorId: z.string().nullish(),
  studentIds: z.array(z.string()).nullish(),
  description: z.string().nullish(),
  recordingNotes: z.string().nullish(),
  status: z.enum(CLASS_STATUSES, { error: 'Estado de clase inválido.' }).optional(),
  meetLink: z.string().nullish(),
  youtubeUrl: z.string().nullish(),
  imageKey: z.string().max(300).nullish(),
  imageKeys: z
    .array(z.string().min(1).max(300))
    .max(MAX_CLASS_IMAGES, `Puedes subir hasta ${MAX_CLASS_IMAGES} fotos.`)
    .optional(),
});

const assignmentText = (missing: string, tooShort: string, min: number, max: number) =>
  z
    .string({ error: missing })
    .transform((v) => cleanText(v, max))
    .refine((v): v is string => v !== null && v.length >= min, { message: tooShort });

/** Archivo con las instrucciones de la tarea (ya subido al almacenamiento). `null` lo quita al editar. */
const assignmentAttachment = z
  .object({
    key: z.string().min(1).max(300),
    name: z.string().min(1).max(120),
  })
  .nullable()
  .optional();

const assignmentContent = {
  title: assignmentText('Escribe el título de la tarea.', 'Escribe un título de al menos 3 letras.', 3, 200),
  // Las instrucciones escritas son opcionales si se adjunta un archivo (se comprueba más abajo).
  description: z
    .string()
    .transform((v) => cleanText(v, 4000) ?? '')
    .optional(),
  attachment: assignmentAttachment,
  dueDate: dateField('Elige la fecha y la hora límite de entrega.'),
  deliveryType: z.enum(DELIVERY_TYPES, { error: 'Elige qué deben entregar las estudiantes.' }),
  notesRequired: z.boolean({ error: 'Indica si el comentario es obligatorio.' }),
  allowLate: z.boolean({ error: 'Indica si se aceptan entregas tardías.' }),
};

const INSTRUCTIONS_REQUIRED = 'Escribe las instrucciones (mínimo 10 caracteres) o adjunta un archivo con ellas.';

/** Hacen falta instrucciones escritas o un archivo con ellas. En la edición, `attachment` ausente conserva el actual. */
const needsInstructions = (
  value: { description?: string; attachment?: { key: string } | null },
  ctx: z.RefinementCtx,
  hasExistingAttachment: boolean,
) => {
  const written = (value.description ?? '').length >= 10;
  const attached = value.attachment ? true : value.attachment === undefined && hasExistingAttachment;
  if (!written && !attached) ctx.addIssue({ code: 'custom', path: ['description'], message: INSTRUCTIONS_REQUIRED });
};

export const updateAssignmentSchema = z
  .object({
    id: requiredId('ID de tarea requerido.'),
    ...assignmentContent,
    deliveryType: assignmentContent.deliveryType.optional(),
    notesRequired: assignmentContent.notesRequired.optional(),
    allowLate: assignmentContent.allowLate.optional(),
  })
  // En la edición, si no se envía `attachment` se conserva el archivo que ya tenía; el servidor lo comprueba.
  .superRefine((v, ctx) => needsInstructions(v, ctx, v.attachment === undefined));

export const createAssignmentSchema = z
  .object({
    classId: requiredId('Elige la clase de la tarea.'),
    ...assignmentContent,
    // Las pestañas abiertas antes de esta versión no envían estos campos: se usa lo de siempre.
    deliveryType: assignmentContent.deliveryType.default('FILE_OR_LINK'),
    notesRequired: assignmentContent.notesRequired.default(true),
    allowLate: assignmentContent.allowLate.default(true),
  })
  .superRefine((v, ctx) => needsInstructions(v, ctx, false));

export const createResourceSchema = z.object({
  classId: requiredId('Todos los campos son obligatorios y deben ser válidos.'),
  title: requiredText('Todos los campos son obligatorios y deben ser válidos.', 200),
  type: z.enum(RESOURCE_TYPES, { error: 'Todos los campos son obligatorios y deben ser válidos.' }),
  url: z
    .string({ error: 'Todos los campos son obligatorios y deben ser válidos.' })
    .min(1, 'Todos los campos son obligatorios y deben ser válidos.'),
});

export const createSubmissionSchema = z.object({
  assignmentId: requiredId('ID de tarea requerido.'),
  notes: z.string().nullish(),
  fileUrl: z.string().nullish(),
  fileType: z.enum(SUBMISSION_FILE_TYPES, { error: 'Tipo de entrega inválido.' }).optional(),
});

export const gradeSubmissionSchema = z.object({
  submissionId: requiredId('ID de entrega requerido.'),
  grade: z.union([z.string(), z.number()]).nullish(),
  feedback: z.string().nullish(),
});

export const markAttendanceSchema = z.object({ classId: requiredId('ID de clase requerido.') });

export const uploadRequestSchema = z.object({
  category: z.string({ error: 'Categoría de archivo inválida.' }),
  fileName: z
    .string({ error: 'Falta nombre de archivo o tipo de contenido.' })
    .min(1, 'Falta nombre de archivo o tipo de contenido.'),
  contentType: z
    .string({ error: 'Falta nombre de archivo o tipo de contenido.' })
    .min(1, 'Falta nombre de archivo o tipo de contenido.'),
  sizeBytes: z
    .number({ error: 'Falta el tamaño del archivo.' })
    .finite('Falta el tamaño del archivo.')
    .positive('Falta el tamaño del archivo.'),
});

export const startConversationSchema = z.object({ userId: requiredId('Falta la persona.') });

const broadcastAudienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('myStudents') }),
  z.object({ type: z.literal('class'), classId: requiredId('Falta la clase.') }),
  z.object({ type: z.literal('role'), role: z.enum(ROLES, { error: 'Rol inválido.' }) }),
  z.object({ type: z.literal('everyone') }),
  z.object({
    type: z.literal('custom'),
    userIds: z
      .array(requiredId('Persona inválida.'))
      .min(1, 'Elige al menos una persona.')
      .max(500, 'Elige hasta 500 personas.'),
  }),
]);

export const broadcastPreviewSchema = z.object({ audience: broadcastAudienceSchema });

export const broadcastSendSchema = z.object({
  audience: broadcastAudienceSchema,
  body: z
    .string({ error: 'Escribe un mensaje.' })
    .min(1, 'Escribe un mensaje.')
    .max(4000, 'El mensaje es demasiado largo.'),
  /** Personas que quien escribe quitó de la lista antes de enviar. */
  excludeIds: z.array(requiredId('Persona inválida.')).max(500).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: requiredId('Falta la conversación.'),
  body: z.string({ error: 'Escribe un mensaje.' }).max(4000, 'El mensaje es demasiado largo.').default(''),
  attachment: z
    .object({
      key: z.string().min(1).max(300),
      name: z.string().min(1).max(120),
      type: z.string().min(1).max(100),
      size: z
        .number()
        .int()
        .positive()
        .max(50 * 1024 * 1024),
    })
    .optional(),
});

export const blockUserSchema = z.object({ userId: requiredId('Falta la persona.'), blocked: z.boolean() });

export const reportMessageSchema = z.object({
  messageId: requiredId('Falta el mensaje.'),
  reason: z
    .string({ error: 'Cuéntanos el motivo.' })
    .min(3, 'Cuéntanos el motivo.')
    .max(500, 'El motivo es demasiado largo.'),
});

export const reviewReportSchema = z.object({ id: requiredId('Falta el reporte.') });

export const markConversationReadSchema = z.object({ conversationId: requiredId('Falta la conversación.') });

export const markNotificationsReadSchema = z
  .object({ id: z.string().min(1).optional(), all: z.boolean().optional() })
  .refine((v) => v.all === true || Boolean(v.id), { message: 'Indica qué notificación marcar.' });
