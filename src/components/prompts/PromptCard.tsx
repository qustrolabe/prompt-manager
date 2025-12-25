import React from "react";
import { Prompt } from "@/schemas/schemas.ts";
import { parseTemplateKeywords } from "@/utils/templateUtils.ts";
import { FiCopy } from "react-icons/fi";

/**
 * Renders text with {{placeholders}} as colored capsules.
 * - Unreplaced placeholders: violet capsule showing {{keyword}}
 * - Replaced placeholders: green capsule showing the filled value
 */
function renderTextWithPlaceholders(
  originalText: string,
  templateValues?: Record<string, string>,
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(originalText)) !== null) {
    // Add text before the placeholder
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {originalText.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const keyword = match[1];
    const value = templateValues?.[keyword];
    const isReplaced = value !== undefined && value !== "";

    parts.push(
      <span
        key={`placeholder-${match.index}`}
        className={isReplaced
          ? "inline-block px-1.5 py-0.5 mx-0.5 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          : "inline-block px-1.5 py-0.5 mx-0.5 text-[11px] font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"}
      >
        {isReplaced ? value : `{{${keyword}}}`}
      </span>,
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < originalText.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {originalText.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? parts : originalText;
}

interface PromptCardProps {
  prompt: Prompt;
  onClick: () => void;
  onCopy: () => void;
}

export function PromptCard({ prompt, onClick, onCopy }: PromptCardProps) {
  const keywords = prompt.mode === "template"
    ? parseTemplateKeywords(prompt.text)
    : [];

  // For templates, render with highlighted placeholders; for raw, just show text
  const displayContent = prompt.mode === "template"
    ? renderTextWithPlaceholders(prompt.text, prompt.templateValues)
    : prompt.text;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer border border-panel-border bg-panel p-4 transition-all hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-500"
    >
      {/* Header with title and mode badge */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {prompt.title && (
            <h3 className="mb-1 truncate font-semibold text-neutral-900 dark:text-neutral-100">
              {prompt.title}
            </h3>
          )}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 font-medium text-[10px] ${
                prompt.mode === "template"
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {prompt.mode === "template" ? "Template" : "Raw"}
            </span>
            {keywords.length > 0 && (
              <span className="text-neutral-500 text-[10px]">
                {keywords.length} field{keywords.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
            title="Copy prompt"
          >
            <FiCopy size={14} />
          </button>
        </div>
      </div>

      {/* Text preview */}
      <p className="whitespace-pre-wrap font-mono text-neutral-700 text-sm dark:text-neutral-300">
        {displayContent}
      </p>

      {/* Description */}
      {prompt.description && (
        <p className="mt-2 line-clamp-1 text-neutral-500 text-xs italic">
          {prompt.description}
        </p>
      )}

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {prompt.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="bg-neutral-100 px-2 py-0.5 text-neutral-600 text-[10px] dark:bg-neutral-800 dark:text-neutral-400"
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > 5 && (
            <span className="text-neutral-500 text-[10px]">
              +{prompt.tags.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
