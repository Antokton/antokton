import React, { useRef, useState } from "react";
import { normalizeImageFocus } from "@/lib/imageFocus";

const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const MIN_ZOOM = 0.2;

export default function ImageFocusPreview({
  src,
  alt = "Foto",
  focus,
  onChange,
  className = "h-64 w-full",
  imageClassName = "",
  onError,
}) {
  const containerRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const [imageMetrics, setImageMetrics] = useState(null);
  const normalizedFocus = normalizeImageFocus(focus);

  const getFrame = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !imageMetrics?.width || !imageMetrics?.height) return null;
    const coverScale = Math.max(rect.width / imageMetrics.width, rect.height / imageMetrics.height);
    const containScale = Math.min(rect.width / imageMetrics.width, rect.height / imageMetrics.height);
    const coverRatio = containScale / Math.max(coverScale, 0.0001);
    const zoom = normalizedFocus.zoom < 1
      ? coverRatio + ((normalizedFocus.zoom - MIN_ZOOM) / (1 - MIN_ZOOM)) * (1 - coverRatio)
      : normalizedFocus.zoom;
    const scale = coverScale * Math.max(coverRatio, zoom);
    const width = imageMetrics.width * scale;
    const height = imageMetrics.height * scale;
    return {
      width,
      height,
      left: (rect.width - width) * (normalizedFocus.x / 100),
      top: (rect.height - height) * (normalizedFocus.y / 100),
    };
  };

  const frame = getFrame();

  const startGesture = () => {
    const points = [...pointersRef.current.values()];
    if (points.length === 0) return;
    gestureRef.current = {
      focus: normalizedFocus,
      points,
      distance: points.length >= 2 ? distanceBetween(points[0], points[1]) : 0,
    };
  };

  const updateFocus = (patch) => {
    onChange?.(normalizeImageFocus({ ...normalizedFocus, ...patch }));
  };

  const handlePointerDown = (event) => {
    if (!onChange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startGesture();
  };

  const handlePointerMove = (event) => {
    if (!onChange || !pointersRef.current.has(event.pointerId) || !gestureRef.current) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    const start = gestureRef.current;

    if (points.length >= 2 && start.points.length >= 2) {
      const nextDistance = distanceBetween(points[0], points[1]);
      const ratio = start.distance > 0 ? nextDistance / start.distance : 1;
      updateFocus({ zoom: start.focus.zoom * ratio });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const firstStartPoint = start.points[0];
    const dx = points[0].x - firstStartPoint.x;
    const dy = points[0].y - firstStartPoint.y;
    updateFocus({
      x: start.focus.x - (dx / Math.max(rect.width, 1)) * 100,
      y: start.focus.y - (dy / Math.max(rect.height, 1)) * 100,
    });
  };

  const endPointer = (event) => {
    pointersRef.current.delete(event.pointerId);
    startGesture();
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ touchAction: onChange ? "none" : "auto", position: "relative" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`select-none ${frame ? "absolute max-w-none" : "h-full w-full object-cover"} ${imageClassName}`}
        style={frame ? {
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          left: `${frame.left}px`,
          top: `${frame.top}px`,
        } : undefined}
        onLoad={(event) => {
          setImageMetrics({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
        onError={onError}
      />
    </div>
  );
}
