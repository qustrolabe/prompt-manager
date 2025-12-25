import { KeyboardEvent, useEffect, useState } from "react";

interface UseTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  enableNegativeTags?: boolean;
}

export function useTagInput({
  tags,
  onChange,
  suggestions,
  enableNegativeTags = false,
}: UseTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter suggestions
  const filteredSuggestions = (() => {
    const isNegative = enableNegativeTags && inputValue.startsWith("-");
    const search = isNegative ? inputValue.slice(1) : inputValue;

    let matches = suggestions.filter((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );

    if (isNegative) {
      matches = matches.map((s) => `-${s}`);
    }

    return matches.filter((s) => !tags.includes(s));
  })();

  // Reset selected index when input changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [inputValue]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        showSuggestions &&
        filteredSuggestions.length > 0 &&
        selectedIndex >= 0
      ) {
        addTag(filteredSuggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return {
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
  };
}
