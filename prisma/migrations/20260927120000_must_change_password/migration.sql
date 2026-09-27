-- Cambio obligatorio de contraseña en el primer ingreso
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Las cuentas ya cargadas (con contraseñas iniciales entregadas por la administración) deben cambiarla al entrar.
-- Las administradoras y las cuentas anonimizadas no se marcan.
UPDATE "User"
SET "mustChangePassword" = true
WHERE "role" <> 'ADMIN' AND "anonymizedAt" IS NULL;
