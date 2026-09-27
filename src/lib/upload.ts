export interface UploadHandle {
  promise: Promise<void>;
  abort: () => void;
}

/**
 * Sube un archivo a una URL firmada con PUT informando el avance (0 a 100).
 * `fetch` no expone el progreso de subida, por eso se usa XMLHttpRequest.
 */
export function uploadWithProgress(url: string, file: File, onProgress: (percent: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`La subida falló (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo.'));
    xhr.onabort = () => reject(new DOMException('Subida cancelada.', 'AbortError'));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}

export const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
