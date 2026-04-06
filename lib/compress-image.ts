import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function compressImage(file: File): Promise<File> {
  // Skip compression for small files (under 1MB) and GIFs (to preserve animation)
  if (file.size <= 1024 * 1024 || file.type === "image/gif") {
    return file;
  }

  return imageCompression(file, COMPRESSION_OPTIONS);
}
