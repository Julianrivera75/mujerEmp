-- La asistencia pasa a medirse por día: se retiran las filas creadas por la permanencia automática en salas compartidas.
-- Cada una era del mismo día que un ingreso real de la estudiante, así que los días presentes no cambian.
DELETE FROM "Attendance" WHERE "source" = 'CARRY';
