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

export function reorderImageGallery(imageUrls = [], fromIndex = 0, toIndex = 0, mainImageIndex = 0) {
  const images = Array.isArray(imageUrls) ? [...imageUrls] : [];
  const currentMainIndex = Math.min(Math.max(Number(mainImageIndex) || 0, 0), Math.max(images.length - 1, 0));

  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= images.length ||
    toIndex >= images.length
  ) {
    return {
      image_urls: images,
      main_image_index: currentMainIndex,
      image_url: images[currentMainIndex] || "",
    };
  }

  const mainImage = images[currentMainIndex] || "";
  const [moved] = images.splice(fromIndex, 1);
  images.splice(toIndex, 0, moved);
  const nextMainIndex = Math.max(mainImage ? images.indexOf(mainImage) : 0, 0);

  return {
    image_urls: images,
    main_image_index: nextMainIndex,
    image_url: images[nextMainIndex] || "",
  };
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
