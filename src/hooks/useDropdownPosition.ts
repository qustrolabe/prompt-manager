import { RefObject, useLayoutEffect, useState } from "react";

interface Position {
  top: number;
  left: number;
  width: number;
}

export function useDropdownPosition(
  containerRef: RefObject<HTMLElement | null>,
  show: boolean,
) {
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + globalThis.scrollY + 4,
        left: rect.left + globalThis.scrollX,
        width: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (show) {
      updatePosition();
      globalThis.addEventListener("resize", updatePosition);
      globalThis.addEventListener("scroll", updatePosition, true);
      return () => {
        globalThis.removeEventListener("resize", updatePosition);
        globalThis.removeEventListener("scroll", updatePosition, true);
      };
    } else {
      setPosition(null);
    }
  }, [show]);

  return position;
}
