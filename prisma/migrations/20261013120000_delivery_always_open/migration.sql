-- La entrega queda siempre abierta: lo que antes "no se pedía" pasa a ser opcional y se permiten hasta 3 archivos.
UPDATE "Assignment" SET "fileRequirement" = 'OPTIONAL' WHERE "fileRequirement" = 'NONE';
UPDATE "Assignment" SET "linkRequirement" = 'OPTIONAL' WHERE "linkRequirement" = 'NONE';
UPDATE "Assignment" SET "textRequirement" = 'OPTIONAL' WHERE "textRequirement" = 'NONE';
UPDATE "Assignment" SET "maxFiles" = 3 WHERE "maxFiles" < 3;
ALTER TABLE "Assignment" ALTER COLUMN "maxFiles" SET DEFAULT 3;
