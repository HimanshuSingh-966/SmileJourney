/**
 * Optimizes captured camera frames and gallery photos for Firebase storage and backend inference.
 * Compresses images to max 800x800 JPEG (~50-90 KB) to ensure safe, reliable storage within
 * Firestore document boundaries and fast transmission to the Python backend.
 */

export async function optimizeSmilePhoto(
  source: File | Blob | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  let imgSource = '';

  if (typeof source === 'string') {
    imgSource = source;
  } else {
    imgSource = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img');
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imgSource;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxWidth || height > maxHeight) {
    if (width / height > maxWidth / maxHeight) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be created');
  }

  ctx.drawImage(img, 0, 0, width, height);

  const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create Blob from canvas'));
      },
      'image/jpeg',
      quality
    );
  });

  return {
    blob,
    dataUrl: optimizedDataUrl,
  };
}
