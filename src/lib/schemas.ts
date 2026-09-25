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
  phone: z.string().nullish().optional(),
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

export const createUserSchema = z.object({
  name: requiredText('Nombre, email, contraseña y rol son obligatorios.', 120),
  email,
  password,
  role: z.enum(ROLES, { error: 'Rol inválido.' }),
  status: z.enum(USER_STATUSES, { error: 'Estado inválido.' }).optional(),
  documentId: optionalText(40),
  phone: optionalText(30),
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
  status: z.enum(USER_STATUSES, { error: 'Estado inválido.' }).optional(),
  documentId: optionalText(40),
  phone: optionalText(30),
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
});

export const createAssignmentSchema = z.object({
  classId: requiredId('Todos los campos son obligatorios y deben ser válidos.'),
  title: requiredText('Todos los campos son obligatorios y deben ser válidos.', 200),
  description: requiredText('Todos los campos son obligatorios y deben ser válidos.', 4000),
  dueDate: dateField('Todos los campos son obligatorios y deben ser válidos.'),
});

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
