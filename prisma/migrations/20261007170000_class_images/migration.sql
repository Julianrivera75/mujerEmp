-- Hasta tres fotos por clase. Las clases con una sola foto la conservan como primera imagen.
ALTER TABLE "ClassSession" ADD COLUMN "imageKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "ClassSession" SET "imageKeys" = ARRAY["imageKey"] WHERE "imageKey" IS NOT NULL;
