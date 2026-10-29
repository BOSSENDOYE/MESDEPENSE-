// Photo de profil : recadrage carré centré et réduction côté téléphone (aucun envoi sur Internet).

export const AVATAR_SIZE = 256;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Zone source à découper pour obtenir un carré centré. Fonction pure. */
export function centeredSquareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value);
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Respecte l'orientation EXIF des photos prises au téléphone.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Repli sur <img> ci-dessous.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Transforme le fichier choisi en image carrée JPEG (data URL) de AVATAR_SIZE px. */
export async function photoToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Image trop lourde (25 Mo maximum).');

  let image: Awaited<ReturnType<typeof loadImage>>;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error('Format d’image non pris en charge. Choisissez une photo JPEG ou PNG.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de traiter l’image sur ce téléphone.');
  const { sx, sy, side } = centeredSquareCrop(image.width, image.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image.source, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  image.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}
