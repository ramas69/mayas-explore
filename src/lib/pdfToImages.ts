/**
 * Convertit les pages d'un PDF en images côté client.
 * Utilise pdf.js pour rendre chaque page sur un canvas.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SCALE = 2; // Qualité (2 = 2x résolution)
const JPEG_QUALITY = 0.85;

export async function pdfToImageUrls(
  file: File,
  uploadPage: (blob: Blob, pageIndex: number) => Promise<string>
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const urls: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponible');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error('toBlob failed'))),
        'image/jpeg',
        JPEG_QUALITY
      );
    });
    const url = await uploadPage(blob, i);
    urls.push(url);
  }

  return urls;
}
