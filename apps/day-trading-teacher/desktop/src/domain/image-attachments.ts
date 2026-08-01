export const MAX_JOURNAL_SCREENSHOTS = 3;
export const MAX_SCREENSHOT_INPUT_BYTES = 5_000_000;
export const MAX_SCREENSHOT_DATA_URL_LENGTH = 3_000_000;

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = /\.(?:jpe?g|png|webp)$/i;

export function screenshotFileIssue(
  file: Pick<File, "name" | "size" | "type">,
) {
  if (
    !allowedMimeTypes.has(file.type.toLowerCase()) &&
    !(file.type === "" && allowedExtensions.test(file.name))
  ) {
    return `${file.name} is not a supported PNG, JPEG, or WebP image.`;
  }
  if (file.size > MAX_SCREENSHOT_INPUT_BYTES) {
    return `${file.name} is larger than 5 MB.`;
  }
  return null;
}

export async function prepareJournalScreenshot(file: File) {
  const issue = screenshotFileIssue(file);
  if (issue) throw new Error(issue);

  const image = await createImageBitmap(file);
  try {
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > 40_000_000
    ) {
      throw new Error(`${file.name} has unsupported image dimensions.`);
    }
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(`${file.name} could not be prepared for the journal.`);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let result = canvas.toDataURL("image/webp", 0.82);
    if (result.length > MAX_SCREENSHOT_DATA_URL_LENGTH)
      result = canvas.toDataURL("image/jpeg", 0.72);
    if (result.length > MAX_SCREENSHOT_DATA_URL_LENGTH) {
      throw new Error(
        `${file.name} is still too large after local optimization.`,
      );
    }
    return result;
  } finally {
    image.close();
  }
}
