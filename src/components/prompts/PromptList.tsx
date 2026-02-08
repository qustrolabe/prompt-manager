import { RefObject, useLayoutEffect, useRef, useState } from "react";
import { Prompt } from "@/schemas/schemas.ts";
import { PromptCard } from "./PromptCard.tsx";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ReactNode } from "react";

interface PromptListProps {
  prompts: Prompt[];
  parentRef: RefObject<HTMLDivElement | null>;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  renderPrompt?: (prompt: Prompt) => ReactNode | null;
  showTitles: boolean;
  showFullPrompt: boolean;
  showTags: boolean;
  showCreatedDate: boolean;
}

export function PromptList({
  prompts,
  parentRef,
  onEdit,
  onDelete,
  renderPrompt,
  showTitles,
  showFullPrompt,
  showTags,
  showCreatedDate,
}: PromptListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setScrollMargin(containerRef.current.offsetTop);
    }
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: prompts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 10,
    scrollMargin,
  });

  if (prompts.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No prompts found matching current filters.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const prompt = prompts[virtualItem.index];
        const customRender = renderPrompt ? renderPrompt(prompt) : null;
        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${
                virtualItem.start - rowVirtualizer.options.scrollMargin
              }px)`,
            }}
            className="pb-4"
          >
            {customRender || (
              <PromptCard
                prompt={prompt}
                onDoubleClick={() => onEdit(prompt)}
                onCopy={() => navigator.clipboard.writeText(prompt.text)}
                onDelete={() => onDelete(prompt)}
                showTitle={showTitles}
                showFullPrompt={showFullPrompt}
                showTags={showTags}
                showCreatedDate={showCreatedDate}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
