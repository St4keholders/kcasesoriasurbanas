/**
 * Utilidades de cliente para soportes:
 * 1. Compresión de imágenes en navegador (máx. 2000 px, JPEG calidad 0.8).
 * 2. Cálculo de hash SHA-256 en el navegador para detección de duplicados.
 * 3. Subida directa a Supabase Storage mediante signed upload URL (sin pasar por Vercel).
 */

export async function computeFileSha256(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function compressImageIfNeeded(
  file: File,
  maxDimension = 2000,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension && file.size < 450_000) {
        resolve(file);
        return;
      }

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height >= width && height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export interface DirectUploadResult {
  storagePath: string;
  sha256: string;
  viewUrl: string;
  isDuplicate: boolean;
  duplicateRecordId?: string;
}

export async function uploadSupportDirect(
  rawFile: File,
  module: 'compras' | 'caja-menor' | 'ventas' | 'ingesta'
): Promise<DirectUploadResult> {
  const processedFile = await compressImageIfNeeded(rawFile, 2000, 0.8);
  const sha256 = await computeFileSha256(processedFile);

  const res = await fetch('/api/soportes/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: processedFile.name,
      contentType: processedFile.type || 'application/octet-stream',
      sha256,
      module,
    }),
  });

  const payload = await res.json();
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'No se pudo obtener URL firmada para el soporte.');
  }

  const { signedUrl, path, duplicate } = payload.data as {
    signedUrl: string;
    path: string;
    duplicate?: { isDuplicate: boolean; recordId?: string };
  };

  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': processedFile.type || 'application/octet-stream',
    },
    body: processedFile,
  });

  if (!uploadRes.ok) {
    throw new Error('Error al subir el soporte directamente a Supabase Storage.');
  }

  const fullPath = `soportes/${path}`;
  return {
    storagePath: fullPath,
    sha256,
    viewUrl: `/api/soportes/view?path=${encodeURIComponent(fullPath)}`,
    isDuplicate: Boolean(duplicate?.isDuplicate),
    duplicateRecordId: duplicate?.recordId,
  };
}
