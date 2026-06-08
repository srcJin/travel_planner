"use client";

import { useRef, useCallback } from "react";

interface ResizableHeaderProps {
  label: string;
  width: number;
  onResize: (width: number) => void;
  className?: string;
}

export function ResizableHeader({ label, width, onResize, className = "" }: ResizableHeaderProps) {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      onResize(Math.max(40, startWidth.current + delta));
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [width, onResize]);

  return (
    <div className={`relative select-none overflow-hidden ${className}`}>
      {label}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
      />
    </div>
  );
}
