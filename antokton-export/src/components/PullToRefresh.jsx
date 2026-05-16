import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY !== 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    setPullDistance(Math.min(distance, 100));
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);

      await onRefresh();

      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, false);
    container.addEventListener("touchmove", handleTouchMove, false);
    container.addEventListener("touchend", handleTouchEnd, false);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: pullDistance }}
        className="flex items-center justify-center bg-gradient-to-b from-[#8ab4ff]/20 to-transparent overflow-hidden"
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}
        >
          <RotateCcw className="w-5 h-5 text-[#8ab4ff]" />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}