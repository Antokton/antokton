import React, { useRef } from "react";
import { getImageFocusStyle, normalizeImageFocus } from "@/lib/imageFocus";

const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function ImageFocusPreview({
  src,
  alt = "Foto",
  focus,
  onChange,
  className = "h-64 w-full",
  imageClassName = "",
  onError,
}) {
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const normalizedFocus = normalizeImageFocus(focus);

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
      className={`overflow-hidden ${className}`}
      style={{ touchAction: onChange ? "none" : "auto" }}
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
        className={`h-full w-full select-none object-cover ${imageClassName}`}
        style={getImageFocusStyle(normalizedFocus)}
        onError={onError}
      />
    </div>
  );
}
