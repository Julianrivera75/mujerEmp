/** Máximo de fotos que se pueden publicar en una clase (todas bajo el mismo enlace). */
export const MAX_CLASS_IMAGES = 3;

/**
 * Fotos de una clase en orden. Las clases anteriores a las tres fotos solo tienen `imageKey`: esa foto cuenta como la
 * primera, sin necesidad de migrar nada a mano.
 */
export function classImageKeys(cls: { imageKey?: string | null; imageKeys?: readonly string[] | null }): string[] {
  if (cls.imageKeys && cls.imageKeys.length > 0) return [...cls.imageKeys];
  return cls.imageKey ? [cls.imageKey] : [];
}
