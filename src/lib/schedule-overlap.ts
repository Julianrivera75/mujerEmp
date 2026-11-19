/**
 * Aviso (no bloqueo) de que una misma mentora quedó con dos clases cuyos horarios se cruzan. Una
 * mentora puede repetirse en varias clases del mismo día; solo se avisa cuando sus propios horarios
 * se solapan, por si fue un error al programar.
 */

/** ¿Se cruzan dos intervalos? Compara instantes absolutos, no depende de zona horaria. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** Límites UTC de un día calendario en Bogotá (UTC−5 fijo, sin horario de verano). `dayKey` en formato AAAA-MM-DD. */
export function bogotaDayRangeUtc(dayKey: string): [Date, Date] {
  const start = new Date(`${dayKey}T05:00:00.000Z`);
  return [start, new Date(start.getTime() + 24 * 60 * 60 * 1000)];
}

export interface OverlapCandidate {
  mentorId: string;
  mentorName: string;
  title: string;
  dateStart: Date;
  dateEnd: Date;
}

export interface OverlapWarning {
  mentorId: string;
  mentorName: string;
  classATitle: string;
  classBTitle: string;
}

/** Avisa, sin bloquear, qué clases de una misma mentora quedan con horarios cruzados. */
export function findMentorOverlaps(classes: readonly OverlapCandidate[]): OverlapWarning[] {
  const warnings: OverlapWarning[] = [];
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i];
      const b = classes[j];
      if (a.mentorId !== b.mentorId) continue;
      if (!overlaps(a.dateStart, a.dateEnd, b.dateStart, b.dateEnd)) continue;
      warnings.push({ mentorId: a.mentorId, mentorName: a.mentorName, classATitle: a.title, classBTitle: b.title });
    }
  }
  return warnings;
}
