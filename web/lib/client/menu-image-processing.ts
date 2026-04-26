export interface OptimizedMenuImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
}

export interface MenuImageCropSettings {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const MENU_IMAGE_TARGET_WIDTH = 960;
export const MENU_IMAGE_TARGET_HEIGHT = 720;
export const MENU_IMAGE_MAX_BYTES = 300 * 1024;

const MIN_WEBP_QUALITY = 0.02;
const WEBP_QUALITY_STEP = 0.05;
const DEFAULT_WEBP_QUALITY = 0.82;

function fileBaseName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read image"));
    };
    element.src = objectUrl;
  });

  return createImageBitmap(image);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to optimize image"));
      },
      type,
      quality,
    );
  });
}

export async function optimizeMenuImageFile(
  file: File,
  crop: MenuImageCropSettings = { zoom: 1, offsetX: 0, offsetY: 0 },
): Promise<OptimizedMenuImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid image file");
  }

  const bitmap = await loadBitmap(file);
  const sourceAspect = bitmap.width / bitmap.height;
  const targetAspect = MENU_IMAGE_TARGET_WIDTH / MENU_IMAGE_TARGET_HEIGHT;
  let baseSourceWidth = bitmap.width;
  let baseSourceHeight = bitmap.height;

  if (sourceAspect > targetAspect) {
    baseSourceWidth = Math.round(bitmap.height * targetAspect);
  } else if (sourceAspect < targetAspect) {
    baseSourceHeight = Math.round(bitmap.width / targetAspect);
  }

  const zoom = Math.max(1, Math.min(crop.zoom, 3));
  const sourceWidth = Math.round(baseSourceWidth / zoom);
  const sourceHeight = Math.round(baseSourceHeight / zoom);
  const maxSourceX = Math.max(0, bitmap.width - sourceWidth);
  const maxSourceY = Math.max(0, bitmap.height - sourceHeight);
  const centeredX = maxSourceX / 2;
  const centeredY = maxSourceY / 2;
  const sourceX = Math.round(
    Math.max(
      0,
      Math.min(
        maxSourceX,
        centeredX + (Math.max(-100, Math.min(crop.offsetX, 100)) / 100) * centeredX,
      ),
    ),
  );
  const sourceY = Math.round(
    Math.max(
      0,
      Math.min(
        maxSourceY,
        centeredY + (Math.max(-100, Math.min(crop.offsetY, 100)) / 100) * centeredY,
      ),
    ),
  );

  const canvas = document.createElement("canvas");
  canvas.width = MENU_IMAGE_TARGET_WIDTH;
  canvas.height = MENU_IMAGE_TARGET_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Image processing is not available");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#20130D";
  context.fillRect(0, 0, MENU_IMAGE_TARGET_WIDTH, MENU_IMAGE_TARGET_HEIGHT);
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    MENU_IMAGE_TARGET_WIDTH,
    MENU_IMAGE_TARGET_HEIGHT,
  );
  bitmap.close();

  let quality = DEFAULT_WEBP_QUALITY;
  let blob = await canvasToBlob(canvas, "image/webp", quality);
  while (blob.size > MENU_IMAGE_MAX_BYTES && quality > MIN_WEBP_QUALITY) {
    quality = Math.max(MIN_WEBP_QUALITY, quality - WEBP_QUALITY_STEP);
    blob = await canvasToBlob(canvas, "image/webp", quality);
  }
  if (blob.size > MENU_IMAGE_MAX_BYTES) {
    throw new Error("Optimized image is still too large");
  }

  const optimizedFile = new File(
    [blob],
    `${fileBaseName(file.name) || "menu-item"}.webp`,
    {
      type: "image/webp",
      lastModified: Date.now(),
    },
  );

  return {
    file: optimizedFile,
    previewUrl: URL.createObjectURL(blob),
    width: MENU_IMAGE_TARGET_WIDTH,
    height: MENU_IMAGE_TARGET_HEIGHT,
    originalBytes: file.size,
    optimizedBytes: optimizedFile.size,
  };
}
