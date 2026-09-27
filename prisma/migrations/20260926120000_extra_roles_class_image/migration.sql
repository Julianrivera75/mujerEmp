-- Roles adicionales de una misma cuenta
ALTER TABLE "User" ADD COLUMN "extraRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];

-- Afiche o imagen de la clase
ALTER TABLE "ClassSession" ADD COLUMN "imageKey" TEXT;

-- El mes de una clase se calcula en la zona horaria de la organización (Miami), no en la del servidor
UPDATE "ClassSession"
SET "monthKey" = to_char("dateStart" AT TIME ZONE 'America/New_York', 'YYYY-MM');
