import { useEffect, useRef } from "react";
import { TagPill } from "./TagPill.tsx";
import { SuggestionsDropdown } from "./SuggestionsDropdown.tsx";
import { useTagInput } from "@/hooks/useTagInput.ts";
import { useDropdownPosition } from "@/hooks/useDropdownPosition.ts";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  enableNegativeTags?: boolean;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = "Add tag...",
  enableNegativeTags = false,
}: TagInputProps) {
  const {
    inputValue,
    setInputValue,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    setSelectedIndex,
    filteredSuggestions,
    addTag,
    removeTag,
    handleKeyDown,
  } = useTagInput({ tags, onChange, suggestions, enableNegativeTags });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dropdownPos = useDropdownPosition(
    containerRef,
    showSuggestions && !!inputValue && filteredSuggestions.length > 0,
  );

  // Handle ESC key natively to prevent bubbling to window/dialog
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleKeydownNative = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSuggestions) {
        // Stop it from reaching PromptEditOverlay's window listener
        e.stopPropagation();
        e.stopImmediatePropagation();
        setShowSuggestions(false);
      }
    };

    input.addEventListener("keydown", handleKeydownNative, { capture: true });
    return () =>
      input.removeEventListener("keydown", handleKeydownNative, {
        capture: true,
      });
  }, [showSuggestions, setShowSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdown = document.getElementById("tag-input-dropdown");

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!dropdown || !dropdown.contains(target))
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowSuggestions]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-xl border border-panel-border bg-panel-2 p-2">
        {tags.map((tag) => (
          <TagPill
            key={tag}
            tag={tag}
            onRemove={removeTag}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-neutral-900 text-sm placeholder-neutral-400 outline-none dark:text-neutral-100"
        />
      </div>

      <SuggestionsDropdown
        suggestions={filteredSuggestions}
        selectedIndex={selectedIndex}
        position={dropdownPos}
        onSelect={addTag}
        onHover={setSelectedIndex}
      />
    </div>
  );
}
