export const FLOOR_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const FLOOR_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function clampPercent(value: number) {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function normalizeImageMime(mime: string | null | undefined) {
  const value = (mime ?? "").toLowerCase().trim();
  if (value === "image/jpg") return "image/jpeg";
  return value;
}

export function isAllowedFloorImage(mime: string, size: number) {
  const normalized = normalizeImageMime(mime);
  return FLOOR_IMAGE_TYPES.has(normalized) && size > 0 && size <= FLOOR_IMAGE_MAX_BYTES;
}
