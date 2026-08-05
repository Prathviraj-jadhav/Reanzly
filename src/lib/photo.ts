// ===== Photo capture helper =====
// Downsamples camera input to a base64 JPEG small enough for localStorage + DB.
// Returns { full, thumb } data URLs.

export interface CapturedPhoto {
  full: string; // ~1024px JPEG
  thumb: string; // ~320px JPEG
  width: number;
  height: number;
  bytes: number;
}

const MAX_DIM = 1024;
const THUMB_DIM = 320;
const JPEG_QUALITY = 0.72;
const THUMB_QUALITY = 0.55;

/**
 * Read a File (from <input type="file" capture>) and return a downsampled
 * base64 JPEG plus a thumbnail. Resolves with null if the file is not an image
 * or if canvas extraction fails (e.g. tainted canvas / no DOM).
 */
export function fileToCapturedPhoto(file: File): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const full = drawScaled(img, MAX_DIM, JPEG_QUALITY);
        const thumb = drawScaled(img, THUMB_DIM, THUMB_QUALITY);
        URL.revokeObjectURL(url);
        resolve({
          full: full.dataUrl,
          thumb: thumb.dataUrl,
          width: full.width,
          height: full.height,
          bytes: full.dataUrl.length,
        });
      } catch (err) {
        console.warn("[photo] drawScaled failed", err);
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function drawScaled(
  img: HTMLImageElement,
  maxDim: number,
  quality: number
): { dataUrl: string; width: number; height: number } {
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width: w, height: h };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
