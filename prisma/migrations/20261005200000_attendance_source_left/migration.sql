-- Asistencia en salas compartidas: origen del registro y salida de la sala
CREATE TYPE "AttendanceSource" AS ENUM ('CLICK', 'CARRY');

ALTER TABLE "Attendance" ADD COLUMN "source" "AttendanceSource" NOT NULL DEFAULT 'CLICK';
ALTER TABLE "Attendance" ADD COLUMN "leftAt" TIMESTAMP(3);
