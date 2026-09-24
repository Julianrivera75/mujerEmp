const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Este script borra TODAS las tablas y crea cuentas de prueba con una contraseña pública.
// Solo debe usarse en desarrollo local; se bloquea en producción a menos que se autorice de forma explícita.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'yes') {
  console.error('Seed bloqueado: NODE_ENV=production. Este script elimina todos los datos.');
  process.exit(1);
}

async function main() {
  console.log('🌱 Limpiando base de datos previa...');
  await prisma.attendance.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.classResource.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Creando usuarios iniciales...');
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Administrador
  const admin = await prisma.user.create({
    data: {
      name: 'Directora General (Admin)',
      email: 'admin@empoderas.org',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVO',
      documentId: 'CC-1020304050',
      phone: '+57 300 123 4567',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-12-31'),
    }
  });

  // 2. Mentores
  const mentor1 = await prisma.user.create({
    data: {
      name: 'Dra. Carolina Morales',
      email: 'carolina.mentor@empoderas.org',
      passwordHash,
      role: 'MENTOR',
      status: 'ACTIVO',
      documentId: 'CC-1098765432',
      phone: '+57 311 987 6543',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-12-31'),
    }
  });

  const mentor2 = await prisma.user.create({
    data: {
      name: 'Mg. Valeria Quintana',
      email: 'valeria.mentor@empoderas.org',
      passwordHash,
      role: 'MENTOR',
      status: 'ACTIVO',
      documentId: 'CC-1087654321',
      phone: '+57 312 876 5432',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-12-31'),
    }
  });

  // 3. Estudiantes
  const student1 = await prisma.user.create({
    data: {
      name: 'Sofía Rodríguez',
      email: 'sofia.estudiante@empoderas.org',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVO',
      documentId: 'TI-1011223344',
      phone: '+57 315 443 2211',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-11-30'),
    }
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Lucía Fernández',
      email: 'lucia.estudiante@empoderas.org',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVO',
      documentId: 'CC-1033445566',
      phone: '+57 316 554 3322',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-11-30'),
    }
  });

  const student3 = await prisma.user.create({
    data: {
      name: 'Camila Torres',
      email: 'camila.estudiante@empoderas.org',
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVO',
      documentId: 'CC-1044556677',
      phone: '+57 317 665 4433',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-11-30'),
    }
  });

  // Estudiante Inactivo para validar que el sistema le impida el login
  const studentInactive = await prisma.user.create({
    data: {
      name: 'Mariana Inactiva (Prueba Inactiva)',
      email: 'inactiva@empoderas.org',
      passwordHash,
      role: 'STUDENT',
      status: 'INACTIVO',
      documentId: 'CC-1099887766',
      phone: '+57 310 000 0000',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    }
  });

  console.log('🌱 Creando clases del mes...');
  // Mes actual (2026-09)
  const currentMonthKey = '2026-09';

  // Clase 1: Ya dictada con link de YouTube para grabación
  const class1 = await prisma.classSession.create({
    data: {
      title: 'Módulo 1: Liderazgo Transformacional e Identidades Diversas',
      description: 'Fundamentos de liderazgo comunitario, empoderamiento de colectivos y creación de redes de apoyo.',
      dateStart: new Date('2026-09-02T14:00:00Z'),
      dateEnd: new Date('2026-09-02T16:00:00Z'),
      meetLink: 'https://meet.google.com/abc-emp-div',
      youtubeUrl: 'https://www.youtube.com/watch?v=7g1Fp-wG610',
      recordingNotes: 'Grabación completa de la sesión 1: Introducción a los conceptos clave y dinámica grupal.',
      status: 'FINALIZADA',
      monthKey: currentMonthKey,
      mentorId: mentor1.id,
      enrollments: {
        create: [
          { studentId: student1.id },
          { studentId: student2.id },
          { studentId: student3.id },
        ]
      },
      resources: {
        create: [
          { title: 'Guía de Liderazgo Comunitario (PDF)', type: 'DOCUMENT', url: 'https://ejemplo.org/docs/guia-liderazgo.pdf' },
          { title: 'Grabación de la Sesión en YouTube', type: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=7g1Fp-wG610' }
        ]
      }
    }
  });

  // Registrar asistencia previa a la Clase 1 para Sofía
  await prisma.attendance.create({
    data: {
      classId: class1.id,
      studentId: student1.id,
      joinedAt: new Date('2026-09-02T14:02:15Z')
    }
  });

  // Tarea de la Clase 1
  const assignment1 = await prisma.assignment.create({
    data: {
      classId: class1.id,
      creatorId: mentor1.id,
      title: 'Ensayo reflexivo: Mi proyecto de impacto personal',
      description: 'Escribir una reflexión de 1 a 2 páginas sobre cómo aplicar las herramientas de liderazgo en tu territorio o entorno comunitario.',
      dueDate: new Date('2026-09-15T23:59:00Z'),
    }
  });

  // Entrega ya calificada de Sofía
  await prisma.submission.create({
    data: {
      assignmentId: assignment1.id,
      studentId: student1.id,
      submittedAt: new Date('2026-09-04T18:30:00Z'),
      fileUrl: 'https://ejemplo.org/tareas/ensayo-sofia.pdf',
      fileType: 'PDF',
      notes: 'Envío mi ensayo profesora Carolina, quedo atenta a sus valiosas observaciones.',
      grade: 4.8,
      feedback: 'Excelente reflexión, Sofía. Identificas muy bien las problemáticas territoriales y planteas soluciones prácticas y empáticas. ¡Sigue así!',
      gradedAt: new Date('2026-09-05T10:15:00Z')
    }
  });

  // Clase 2: Próxima clase virtual (Google Meet activo)
  const class2 = await prisma.classSession.create({
    data: {
      title: 'Módulo 2: Habilidades Digitales y Emprendimiento Colaborativo',
      description: 'Herramientas digitales, diseño de proyectos en línea y gestión de comunidades virtuales.',
      dateStart: new Date('2026-09-12T15:00:00Z'),
      dateEnd: new Date('2026-09-12T17:00:00Z'),
      meetLink: 'https://meet.google.com/xyz-emp-div',
      status: 'PROGRAMADA',
      monthKey: currentMonthKey,
      mentorId: mentor1.id,
      enrollments: {
        create: [
          { studentId: student1.id },
          { studentId: student2.id },
          { studentId: student3.id },
        ]
      }
    }
  });

  // Tarea pendiente para la clase 2
  await prisma.assignment.create({
    data: {
      classId: class2.id,
      creatorId: mentor1.id,
      title: 'Mapa conceptual: Herramientas tecnológicas comunitarias',
      description: 'Crear un esquema o mapa mental con al menos 3 herramientas digitales para la gestión comunitaria.',
      dueDate: new Date('2026-09-20T23:59:00Z'),
    }
  });

  // Clase 3: Impartida por Valeria Quintana
  const class3 = await prisma.classSession.create({
    data: {
      title: 'Módulo 3: Formulación de Proyectos Sociales y Sostenibilidad',
      description: 'Metodología de marco lógico aplicada a iniciativas comunitarias y búsqueda de financiamiento.',
      dateStart: new Date('2026-09-22T14:00:00Z'),
      dateEnd: new Date('2026-09-22T16:00:00Z'),
      meetLink: 'https://meet.google.com/pro-soc-meet',
      status: 'PROGRAMADA',
      monthKey: currentMonthKey,
      mentorId: mentor2.id,
      enrollments: {
        create: [
          { studentId: student1.id },
          { studentId: student2.id },
        ]
      }
    }
  });

  console.log('✅ Base de datos inicializada exitosamente.');
  console.log('Credenciales de prueba (contraseña para todos: 123456):');
  console.log('  👑 Admin:     admin@empoderas.org');
  console.log('  👩‍🏫 Mentor 1:  carolina.mentor@empoderas.org');
  console.log('  👩‍🏫 Mentor 2:  valeria.mentor@empoderas.org');
  console.log('  🎓 Alumna 1:  sofia.estudiante@empoderas.org');
  console.log('  🎓 Alumna 2:  lucia.estudiante@empoderas.org');
  console.log('  ⛔ Inactiva:  inactiva@empoderas.org (Prueba de bloqueo)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
