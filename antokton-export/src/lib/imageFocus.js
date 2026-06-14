export const DEFAULT_IMAGE_FOCUS = { x: 50, y: 50, zoom: 1 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function parseImageFocusMap(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeImageFocus(value = {}) {
  return {
    x: clamp(Number(value?.x ?? DEFAULT_IMAGE_FOCUS.x), 0, 100),
    y: clamp(Number(value?.y ?? DEFAULT_IMAGE_FOCUS.y), 0, 100),
    zoom: clamp(Number(value?.zoom ?? DEFAULT_IMAGE_FOCUS.zoom), 0.2, 3),
  };
}

export function getImageFocus(map, imageUrl) {
  const parsed = parseImageFocusMap(map);
  return normalizeImageFocus(parsed[imageUrl] || {});
}

export function updateImageFocus(map, imageUrl, patch) {
  if (!imageUrl) return parseImageFocusMap(map);
  return {
    ...parseImageFocusMap(map),
    [imageUrl]: normalizeImageFocus({ ...getImageFocus(map, imageUrl), ...patch }),
  };
}

export function pruneImageFocusMap(map, imageUrls = []) {
  const allowed = new Set((imageUrls || []).filter(Boolean));
  return Object.fromEntries(
    Object.entries(parseImageFocusMap(map)).filter(([imageUrl]) => allowed.has(imageUrl))
  );
}

export function getImageFocusStyle(focus) {
  const normalized = normalizeImageFocus(focus);
  const isZoomedOut = normalized.zoom < 1;
  return {
    objectFit: isZoomedOut ? "contain" : "cover",
    objectPosition: `${normalized.x}% ${normalized.y}%`,
    transform: isZoomedOut ? "scale(1)" : `scale(${normalized.zoom})`,
    transformOrigin: `${normalized.x}% ${normalized.y}%`,
  };
}
