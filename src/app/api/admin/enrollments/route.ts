import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { findMissingEnrollments, syncMissingEnrollments } from '@/lib/enrollment';

export const dynamic = 'force-dynamic';

const SAMPLE_SIZE = 15;
const CLASS_LIMIT = 10;

/** Resumen de las inscripciones que faltan (solo lectura). */
export const GET = withAuth('admin/enrollments GET', ['ADMIN'], async () => {
  const { pairs: _pairs, classes, students, ...summary } = await findMissingEnrollments();
  return NextResponse.json({
    ...summary,
    classes: classes.slice(0, CLASS_LIMIT),
    students: students.slice(0, SAMPLE_SIZE),
  });
});

/** Inscribe a las estudiantes activas en las clases vigentes que les faltan. Solo agrega inscripciones. */
export const POST = withAuth('admin/enrollments POST', ['ADMIN'], async () => {
  const added = await syncMissingEnrollments();
  return NextResponse.json({ success: true, added });
});
