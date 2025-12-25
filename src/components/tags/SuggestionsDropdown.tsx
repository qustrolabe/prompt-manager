import { createPortal } from "react-dom";

interface SuggestionsDropdownProps {
  suggestions: string[];
  selectedIndex: number;
  position: { top: number; left: number; width: number } | null;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

export function SuggestionsDropdown({
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onHover,
}: SuggestionsDropdownProps) {
  if (!position) return null;

  return createPortal(
    <div
      id="tag-input-dropdown"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      className="fixed z-9999 mt-1 max-h-40 overflow-y-auto rounded-xl border border-panel-border bg-panel shadow-lg"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(index)}
          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
            index === selectedIndex
              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          }`}
        >
          {suggestion}
        </button>
      ))}
    </div>,
    document.body,
  );
}
