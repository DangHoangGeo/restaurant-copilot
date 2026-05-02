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

export const MENU_IMAGE_TARGET_WIDTH = 1280;
export const MENU_IMAGE_TARGET_HEIGHT = 720;
export const MENU_IMAGE_MIN_WIDTH = 720;
export const MENU_IMAGE_MAX_BYTES = 300 * 1024;

const MIN_WEBP_QUALITY = 0.68;
const WEBP_QUALITY_STEP = 0.04;
const DEFAULT_WEBP_QUALITY = 0.9;
const TARGET_ASPECT_RATIO = MENU_IMAGE_TARGET_WIDTH / MENU_IMAGE_TARGET_HEIGHT;

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
  _crop: MenuImageCropSettings = { zoom: 1, offsetX: 0, offsetY: 0 },
): Promise<OptimizedMenuImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid image file");
  }

  const bitmap = await loadBitmap(file);
  const naturalFrameWidth = Math.round(
    Math.max(bitmap.width, bitmap.height * TARGET_ASPECT_RATIO),
  );
  let outputWidth = Math.min(MENU_IMAGE_TARGET_WIDTH, naturalFrameWidth);
  let outputHeight = Math.round(outputWidth / TARGET_ASPECT_RATIO);
  let canvas = renderMenuImageCanvas(bitmap, outputWidth, outputHeight);

  let quality = DEFAULT_WEBP_QUALITY;
  let blob = await canvasToBlob(canvas, "image/webp", quality);

  while (blob.size > MENU_IMAGE_MAX_BYTES && outputWidth > MENU_IMAGE_MIN_WIDTH) {
    outputWidth = Math.max(MENU_IMAGE_MIN_WIDTH, Math.round(outputWidth * 0.85));
    outputHeight = Math.round(outputWidth / TARGET_ASPECT_RATIO);
    canvas = renderMenuImageCanvas(bitmap, outputWidth, outputHeight);
    quality = DEFAULT_WEBP_QUALITY;
    blob = await canvasToBlob(canvas, "image/webp", quality);
  }

  while (blob.size > MENU_IMAGE_MAX_BYTES && quality > MIN_WEBP_QUALITY) {
    quality = Math.max(MIN_WEBP_QUALITY, quality - WEBP_QUALITY_STEP);
    blob = await canvasToBlob(canvas, "image/webp", quality);
  }

  bitmap.close();

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
    width: outputWidth,
    height: outputHeight,
    originalBytes: file.size,
    optimizedBytes: optimizedFile.size,
  };
}

function renderMenuImageCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Image processing is not available");
  }

  const scale = Math.min(width / bitmap.width, height / bitmap.height);
  const drawWidth = Math.round(bitmap.width * scale);
  const drawHeight = Math.round(bitmap.height * scale);
  const drawX = Math.round((width - drawWidth) / 2);
  const drawY = Math.round((height - drawHeight) / 2);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#20130D";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);

  return canvas;
}
