import { describe, expect, it } from 'vitest';
import { centeredSquareCrop, isImageDataUrl } from './image';

describe('centeredSquareCrop', () => {
  it('recadre une photo en portrait au centre', () => {
    expect(centeredSquareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 });
  });

  it('recadre une photo en paysage au centre', () => {
    expect(centeredSquareCrop(1920, 1080)).toEqual({ sx: 420, sy: 0, side: 1080 });
  });

  it('laisse une image carrée intacte', () => {
    expect(centeredSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });
});

describe('isImageDataUrl', () => {
  it('accepte seulement les images encodées', () => {
    expect(isImageDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(isImageDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isImageDataUrl('https://exemple.com/photo.jpg')).toBe(false);
    expect(isImageDataUrl(null)).toBe(false);
  });
});
