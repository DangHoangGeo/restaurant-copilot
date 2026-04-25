export interface OptimizedMenuImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
}

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 900;
const WEBP_QUALITY = 0.82;

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
): Promise<OptimizedMenuImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid image file");
  }

  const bitmap = await loadBitmap(file);
  const sourceAspect = bitmap.width / bitmap.height;
  const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
  let sourceWidth = bitmap.width;
  let sourceHeight = bitmap.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspect > targetAspect) {
    sourceWidth = Math.round(bitmap.height * targetAspect);
    sourceX = Math.round((bitmap.width - sourceWidth) / 2);
  } else if (sourceAspect < targetAspect) {
    sourceHeight = Math.round(bitmap.width / targetAspect);
    sourceY = Math.round((bitmap.height - sourceHeight) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Image processing is not available");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#20130D";
  context.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    TARGET_WIDTH,
    TARGET_HEIGHT,
  );
  bitmap.close();

  const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
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
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
    originalBytes: file.size,
    optimizedBytes: optimizedFile.size,
  };
}
