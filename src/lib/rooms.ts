import { dayKeyOf } from './months';
import { MEET_HOSTS, parseHttpsUrl } from './validators';

/** Hueco máximo entre una clase y la siguiente para considerarlas parte de la misma sala continua. */
const GAP_MAX_MS = 10 * 60 * 1000;
/** Con cuánta anticipación a su inicio se puede entrar a una clase y que cuente para ella. */
const EARLY_JOIN_MS = 15 * 60 * 1000;

export interface RoomClass {
  id: string;
  title: string;
  dateStart: Date;
  dateEnd: Date;
  meetLink: string | null;
  status?: string;
}

/** Clave de una sala: mismo enlace de Meet sin importar mayúsculas, parámetros o barra final. */
export function meetKey(link: string | null | undefined): string | null {
  const parsed = parseHttpsUrl(link ?? '', MEET_HOSTS);
  if (!parsed) return null;
  const url = new URL(parsed);
  const path = url.pathname.toLowerCase().replace(/\/+$/, '');
  if (!path) return null;
  return `${url.hostname.toLowerCase()}${path}`;
}

/**
 * Agrupa las clases en "cadenas": clases con el mismo enlace de Meet, el mismo día (zona horaria de la organización)
 * y sin un hueco mayor a `GAP_MAX_MS` entre una y la siguiente. Una clase sola forma su propia cadena.
 */
export function groupRooms<T extends RoomClass>(classes: readonly T[]): T[][] {
  const byRoom = new Map<string, T[]>();
  for (const c of classes) {
    if (c.status === 'CANCELADA') continue;
    const key = meetKey(c.meetLink);
    if (!key) continue;
    const bucket = `${key}|${dayKeyOf(c.dateStart)}`;
    byRoom.set(bucket, [...(byRoom.get(bucket) ?? []), c]);
  }

  const chains: T[][] = [];
  for (const group of byRoom.values()) {
    const sorted = [...group].sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
    let chain: T[] = [];
    for (const c of sorted) {
      const previous = chain[chain.length - 1];
      if (previous && c.dateStart.getTime() - previous.dateEnd.getTime() > GAP_MAX_MS) {
        chains.push(chain);
        chain = [];
      }
      chain.push(c);
    }
    if (chain.length > 0) chains.push(chain);
  }
  return chains;
}

/** La clase en curso de una cadena: la que está dictándose o, si no hay, la que empieza en los próximos minutos. */
export function currentClassOf<T extends RoomClass>(chain: readonly T[], now: Date): T | null {
  const t = now.getTime();
  const running = chain.find((c) => c.dateStart.getTime() <= t && t < c.dateEnd.getTime());
  if (running) return running;
  return chain.find((c) => c.dateStart.getTime() - EARLY_JOIN_MS <= t && t < c.dateStart.getTime()) ?? null;
}

/** Cadena que contiene a una clase; null si la clase no tiene enlace de Meet válido o está cancelada. */
export function chainOf<T extends RoomClass>(classId: string, classes: readonly T[]): T[] | null {
  return groupRooms(classes).find((chain) => chain.some((c) => c.id === classId)) ?? null;
}

/**
 * A qué clase debe contarse un clic hecho desde la tarjeta de `clickedId`: a la que está en curso en esa sala
 * (aunque se haya pulsado el botón de otra) o, si no hay ninguna, a la pulsada.
 */
export function resolveTargetClass<T extends RoomClass>(clickedId: string, classes: readonly T[], now: Date): string {
  const chain = chainOf(clickedId, classes);
  if (!chain || chain.length < 2) return clickedId;
  return currentClassOf(chain, now)?.id ?? clickedId;
}

/** Clases que siguen a `classId` dentro de su cadena. */
export function followingClasses<T extends RoomClass>(classId: string, classes: readonly T[]): T[] {
  const chain = chainOf(classId, classes);
  if (!chain) return [];
  const index = chain.findIndex((c) => c.id === classId);
  return chain.slice(index + 1);
}

export interface CarryAttendance {
  classId: string;
  studentId: string;
  leftAt: Date | null;
}

export interface CarryEnrollment {
  classId: string;
  studentId: string;
}

/**
 * Qué asistencias por permanencia hay que crear en una cadena. Para cada par consecutivo A→B, cuando B ya empezó:
 * a cada estudiante inscrita en B que está presente en A (y no avisó que salió) sin fila en B. Se procesa en orden,
 * así que la permanencia se propaga A→B→C.
 */
export function planCarryOver(
  chain: readonly RoomClass[],
  now: Date,
  attendances: readonly CarryAttendance[],
  enrollments: readonly CarryEnrollment[],
): { classId: string; studentId: string; joinedAt: Date }[] {
  const present = new Map<string, Map<string, Date | null>>();
  for (const a of attendances) {
    if (!present.has(a.classId)) present.set(a.classId, new Map());
    present.get(a.classId)?.set(a.studentId, a.leftAt);
  }
  const enrolledIn = new Map<string, Set<string>>();
  for (const e of enrollments) {
    if (!enrolledIn.has(e.classId)) enrolledIn.set(e.classId, new Set());
    enrolledIn.get(e.classId)?.add(e.studentId);
  }

  const created: { classId: string; studentId: string; joinedAt: Date }[] = [];
  for (let i = 1; i < chain.length; i++) {
    const previous = chain[i - 1];
    const next = chain[i];
    if (next.dateStart.getTime() > now.getTime()) break;
    const before = present.get(previous.id) ?? new Map<string, Date | null>();
    const already = present.get(next.id) ?? new Map<string, Date | null>();
    for (const [studentId, leftAt] of before) {
      if (leftAt !== null || already.has(studentId)) continue;
      if (!enrolledIn.get(next.id)?.has(studentId)) continue;
      already.set(studentId, null);
      created.push({ classId: next.id, studentId, joinedAt: next.dateStart });
    }
    present.set(next.id, already);
  }
  return created;
}
