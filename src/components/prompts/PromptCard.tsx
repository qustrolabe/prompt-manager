import React from "react";
import { Prompt } from "@/schemas/schemas.ts";
import { ContextMenu } from "radix-ui";
import { FiCopy } from "react-icons/fi";

interface PromptCardProps {
  prompt: Prompt;
  onClick: () => void;
  onCopy: () => void;
  onDelete: () => void;
  showTitle: boolean;
  showFullPrompt: boolean;
  showTags: boolean;
  showCreatedDate: boolean;
}

export function PromptCard({
  prompt,
  onClick,
  onCopy,
  onDelete,
  showTitle,
  showFullPrompt,
  showTags,
  showCreatedDate,
}: PromptCardProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };
  const title = prompt.title?.trim() || "";

  const createdLabel = prompt.created
    ? new Date(prompt.created).toLocaleString()
    : "Unknown";
  const tooltipLines = [
    `File: ${prompt.filePath ?? prompt.id}`,
    `Created: ${createdLabel}`,
    `Tags: ${prompt.tags.length}`,
    `Title: ${title || "Untitled"}`,
  ];

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          onClick={onClick}
          title={tooltipLines.join("\n")}
          className="group relative cursor-pointer border border-panel-border bg-panel p-4 transition-all hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-500"
        >
          <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
              title="Copy prompt"
            >
              <FiCopy size={14} />
            </button>
          </div>
      {/* Header with title */}
      {showTitle && (
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title
              ? (
                <h3 className="mb-1 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                  {title}
                </h3>
              )
              : (
                <h3 className="mb-1 truncate font-semibold text-neutral-500 dark:text-neutral-400 italic">
                  Untitled Prompt
                </h3>
              )}
          </div>
        </div>
      )}

      {/* Text preview */}
      <p
        className={`whitespace-pre-wrap font-mono text-neutral-700 text-sm dark:text-neutral-300 ${
          showFullPrompt ? "" : "line-clamp-3"
        }`}
      >
        {prompt.text}
      </p>

      {showCreatedDate && (
        <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Created: {createdLabel}
        </div>
      )}

          {/* Tags */}
          {showTags && prompt.tags.length > 0 && (
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
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="w-40 rounded-md border border-panel-border bg-panel p-1 shadow-lg">
          <ContextMenu.Item
            onSelect={onDelete}
            className="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-red-500 hover:bg-red-500/10 focus:outline-none"
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
