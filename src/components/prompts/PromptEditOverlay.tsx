import { useEffect, useMemo, useState } from "react";
import { Prompt } from "@/schemas/schemas.ts";
import { TagInput } from "@/components/tags/TagInput.tsx";
import {
  FiCopy,
  FiCopy as FiDuplicate,
  FiCheck,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { usePromptEditForm } from "@/hooks/usePromptEditForm.ts";
import { useToast } from "@/components/ui/ToastProvider.tsx";

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
    text,
    setText,
    tags,
    setTags,
    filePath,
    setFilePath,
    title,
    setTitle,
    isModified,
  } = usePromptEditForm({
    prompt,
    initialTags,
    isNew,
    initialFilePath: useMemo(() => {
      if (!isNew) return prompt?.filePath || "";
      const pad = (n: number) => n.toString().padStart(2, "0");
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${
        pad(now.getDate())
      }`;
      const random = Math.random().toString(36).slice(2, 8);
      return `${dateStr}-${random}.md`;
    }, [isNew, prompt?.id]),
  });

  const { pushToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (text.includes("```") || text.includes("~~~")) {
      pushToast({
        title: "Invalid prompt content",
        description: "Prompt content can't include ``` or ~~~.",
        variant: "error",
      });
      return;
    }

    const normalizedFilePath = filePath
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    const filePathWithExt = normalizedFilePath
      ? normalizedFilePath.endsWith(".md")
        ? normalizedFilePath
        : `${normalizedFilePath}.md`
      : "";

    if (!filePathWithExt) {
      pushToast({
        title: "Filename required",
        description: "Please enter a filename before saving.",
        variant: "error",
      });
      return;
    }

    if (filePathWithExt.includes("..")) {
      pushToast({
        title: "Invalid filename",
        description: "Filename cannot include '..' segments.",
        variant: "error",
      });
      return;
    }
    if (filePathWithExt.includes("/") || filePathWithExt.includes("\\")) {
      pushToast({
        title: "Invalid filename",
        description: "Subfolders are not supported. Use a plain filename.",
        variant: "error",
      });
      return;
    }

    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${
      pad(
        now.getDate(),
      )
    }T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const updatedPrompt: Prompt = {
      id: filePathWithExt,
      created: prompt?.created || createdStr,
      text: text,
      tags,
      filePath: filePathWithExt,
      previousFilePath: prompt?.filePath || prompt?.id || null,
      title: title.trim() ? title.trim() : null,
    };
    onSave(updatedPrompt);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
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
          {/* Info Hint */}
          <div className="rounded bg-blue-50 p-2 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
            Tip: Titles are optional and stored in frontmatter.
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1">
            <label className="font-medium text-neutral-700 text-sm dark:text-neutral-300">
              Prompt Content
            </label>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your prompt text..."
              className="min-h-[200px] w-full resize-y border border-panel-border bg-panel-2 px-3 py-2 font-mono text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
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

          <div className="grid gap-4 md:grid-cols-2">
            {/* Filename */}
            <div>
              <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
                Filename
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="2026-02-05-abc123.md"
                className="w-full border border-panel-border bg-panel-2 px-3 py-2 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                This becomes the file name in your vault.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="w-full border border-panel-border bg-panel-2 px-3 py-2 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Titles are stored in frontmatter when provided.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-panel-border border-t bg-panel-2 p-4">
          <div className="flex gap-2">
            {!isNew && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(prompt!.id);
                      setConfirmDelete(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <FiCheck size={14} />
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  >
                    <FiX size={14} />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-600 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <FiTrash2 size={14} />
                  Delete
                </button>
              )
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
