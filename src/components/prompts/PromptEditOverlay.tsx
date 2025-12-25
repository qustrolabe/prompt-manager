import { useEffect } from "react";
import { Prompt } from "@/schemas/schemas.ts";
import { applyTemplateValues } from "@/utils/templateUtils.ts";
import { TagInput } from "@/components/tags/TagInput.tsx";
import {
  FiCopy,
  FiCopy as FiDuplicate,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { usePromptEditForm } from "@/hooks/usePromptEditForm.ts";
import { PromptTemplateFields } from "./PromptTemplateFields.tsx";

interface PromptEditOverlayProps {
  prompt: Prompt | null;
  isNew: boolean;
  allTags: string[];
  onSave: (prompt: Prompt) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onClose: () => void;
  initialTags?: string[];
}

export function PromptEditOverlay({
  prompt,
  isNew,
  allTags,
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  initialTags = [],
}: PromptEditOverlayProps) {
  const {
    title,
    setTitle,
    text,
    setText,
    description,
    setDescription,
    tags,
    setTags,
    mode,
    setMode,
    templateValues,
    keywords,
    isModified,
    handleKeywordChange,
  } = usePromptEditForm({ prompt, initialTags, isNew });

  // Handle ESC to close if not modified
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isModified) {
        onClose();
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isModified, onClose]);

  const handleSave = () => {
    const updatedPrompt: Prompt = {
      id: prompt?.id || (crypto.randomUUID()),
      createdAt: prompt?.createdAt || new Date(),
      title: (title || "").trim() || null,
      text: text,
      description: (description || "").trim() || null,
      tags,
      mode,
      templateValues: mode === "template" ? templateValues : undefined,
    };
    onSave(updatedPrompt);
  };

  const handleCopy = () => {
    const outputText = mode === "template"
      ? applyTemplateValues(text, templateValues)
      : text;
    navigator.clipboard.writeText(outputText);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isModified) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-panel-border bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-panel-border p-4">
          <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
            {isNew ? "New Prompt" : "Edit Prompt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Title */}
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Title <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your prompt a title..."
              className="w-full border border-panel-border bg-panel-2 px-3 py-2 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
            />
          </div>

          {/* Mode toggle */}
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("raw")}
                className={`flex-1 px-4 py-2 font-medium text-sm transition-colors ${
                  mode === "raw"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black"
                    : "bg-panel-2 border border-panel-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }`}
              >
                Raw
              </button>
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`flex-1 px-4 py-2 font-medium text-sm transition-colors ${
                  mode === "template"
                    ? "bg-blue-600 text-white"
                    : "bg-panel-2 border border-panel-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }`}
              >
                Template
              </button>
            </div>
            {mode === "template" && (
              <p className="mt-1 text-neutral-500 text-xs">
                Use {"{{keyword}}"} syntax to create input fields
              </p>
            )}
          </div>

          {/* Text */}
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Prompt Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === "template"
                ? "Enter your prompt with {{placeholders}}..."
                : "Enter your prompt text..."}
              className="min-h-[120px] w-full resize-y border border-panel-border bg-panel-2 px-3 py-2 font-mono text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
            />
          </div>

          {/* Template fields */}
          {mode === "template" && (
            <PromptTemplateFields
              keywords={keywords}
              templateValues={templateValues}
              onKeywordChange={handleKeywordChange}
            />
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Description <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this prompt..."
              className="min-h-[60px] w-full resize-y border border-panel-border bg-panel-2 px-3 py-2 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Tags
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={allTags}
              placeholder="Add tags..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-panel-border border-t bg-panel-2 p-4">
          <div className="flex gap-2">
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(prompt!.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-red-600 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <FiTrash2 size={14} />
                Delete
              </button>
            )}
            {!isNew && onDuplicate && (
              <button
                type="button"
                onClick={() => onDuplicate(prompt!.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-neutral-600 text-sm transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                <FiDuplicate size={14} />
                Duplicate
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-neutral-100 px-4 py-2 text-neutral-700 text-sm transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
            >
              <FiCopy size={14} />
              Copy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!text || !text.trim()}
              className="flex items-center gap-1.5 bg-neutral-800 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-200 dark:text-black dark:hover:bg-neutral-300"
            >
              <FiSave size={14} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
