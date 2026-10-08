import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export const receiptImageLimit = 3_500_000;
export function receiptImageSize(base64: string): number {
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}
export function receiptImageDimensions(width: number, height: number) {
  const ratio = Math.min(1, 1600 / width, 8000 / height);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** Preserve long receipt text and archive originals; only the vision copy is resized. */
export async function prepareReceiptImage(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  let image = await context.renderAsync();
  try {
    const dimensions = receiptImageDimensions(image.width, image.height);
    if (dimensions.width !== image.width || dimensions.height !== image.height) {
      context.resize(dimensions);
      image.release();
      image = await context.renderAsync();
    }
    for (const compress of [0.8, 0.6, 0.4]) {
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
      if (result.base64 && receiptImageSize(result.base64) <= receiptImageLimit)
        return { imageBase64: result.base64, mediaType: "image/jpeg" };
    }
    throw new Error("This receipt photo is too large. Crop extra background or take a closer photo and try again.");
  } finally {
    image.release();
    context.release();
  }
}
