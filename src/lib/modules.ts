import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from './legal';

/** Posición (en píxeles del arte original) de una línea en blanco donde se estampa un dato de la estudiante. */
export interface CertificateLine {
  x1: number;
  x2: number;
  /** Línea base del texto. */
  y: number;
}

export interface CertificateModule {
  number: 1 | 2 | 3 | 4 | 5;
  /** Mes del módulo (AAAA-MM); coincide con `ClassSession.monthKey`. */
  monthKey: string;
  title: string;
  /** Fecha de emisión que ya viene impresa en el arte; solo se muestra en pantalla, nunca se dibuja. */
  issuedOn: string;
  art: string;
  name: CertificateLine;
  studentNumber: CertificateLine;
}

/** Tamaño de los artes originales. */
export const CERTIFICATE_ART_SIZE = { width: 1776, height: 1296 } as const;

/** Días finales del mes en los que ya se puede descargar el certificado del módulo. */
const CERTIFICATE_WINDOW_DAYS = 5;

/**
 * Los cinco módulos de la cohorte 2026-2027. El nombre y el número de estudiante son lo único
 * que se estampa sobre el arte; la fecha de emisión y el resto del diseño son fijos.
 */
export const CERTIFICATE_MODULES: readonly CertificateModule[] = [
  {
    number: 1,
    monthKey: '2026-10',
    title: 'Zarpando: Alistando las Velas',
    issuedOn: '2 de noviembre de 2026',
    art: '/certificados/modulo-1.jpg',
    name: { x1: 690, x2: 1290, y: 966 },
    studentNumber: { x1: 900, x2: 1290, y: 1004 },
  },
  {
    number: 2,
    monthKey: '2026-11',
    title: 'Tomando el Timón: Gobernando tu Destino',
    issuedOn: '1 de diciembre de 2026',
    art: '/certificados/modulo-2.jpg',
    name: { x1: 680, x2: 1285, y: 951 },
    studentNumber: { x1: 955, x2: 1285, y: 1006 },
  },
  {
    number: 3,
    monthKey: '2026-12',
    title: 'Resistiendo la Tormenta: El Equipaje',
    issuedOn: '4 de enero de 2027',
    art: '/certificados/modulo-3.jpg',
    name: { x1: 680, x2: 1295, y: 978 },
    studentNumber: { x1: 930, x2: 1295, y: 1038 },
  },
  {
    number: 4,
    monthKey: '2027-01',
    title: 'La Brújula y el Faro: Divisando el Propósito',
    issuedOn: '1 de febrero de 2027',
    art: '/certificados/modulo-4.jpg',
    name: { x1: 678, x2: 1295, y: 974 },
    studentNumber: { x1: 952, x2: 1295, y: 1040 },
  },
  {
    number: 5,
    monthKey: '2027-02',
    title: 'Arribo a Puerto: Tierra Firme',
    issuedOn: '1 de marzo de 2027',
    art: '/certificados/modulo-5.jpg',
    name: { x1: 685, x2: 1285, y: 978 },
    studentNumber: { x1: 935, x2: 1285, y: 1030 },
  },
];

export type ModuleStatus = 'locked' | 'no-classes' | 'low-attendance' | 'available';

/** Primer instante en que se habilita el certificado: los últimos `CERTIFICATE_WINDOW_DAYS` días del mes del módulo. */
export function certificateOpensAt(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, lastDay - CERTIFICATE_WINDOW_DAYS + 1);
}

export function attendancePercentage(attended: number, total: number): number {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
}

/**
 * Estado del certificado de un módulo: se habilita al entrar en la ventana final del mes
 * y exige el porcentaje mínimo de asistencia a las clases de ese módulo.
 */
export function moduleStatus(monthKey: string, now: Date, attended: number, total: number): ModuleStatus {
  if (now < certificateOpensAt(monthKey)) return 'locked';
  if (total === 0) return 'no-classes';
  if (attendancePercentage(attended, total) < CERTIFICATE_MIN_ATTENDANCE_PERCENT) return 'low-attendance';
  return 'available';
}
