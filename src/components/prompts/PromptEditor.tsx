import { useEffect, useMemo, useRef, useState } from "react";
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

interface PromptEditorProps {
  prompt: Prompt | null;
  isNew: boolean;
  allTags: string[];
  onSave: (prompt: Prompt) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onClose: () => void;
  initialTags?: string[];
}

export function PromptEditor({
  prompt,
  isNew,
  allTags,
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  initialTags = [],
}: PromptEditorProps) {
  const {
    text,
    setText,
    tags,
    setTags,
    filePath,
    setFilePath,
    title,
    setTitle,
    description,
    setDescription,
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
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const resizeTextArea = () => {
    if (!textAreaRef.current) return;
    textAreaRef.current.style.height = "0px";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextArea();
  }, [text]);

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
      description: description.trim() ? description.trim() : null,
    };
    onSave(updatedPrompt);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex w-full flex-col overflow-hidden border border-panel-border bg-panel shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
          {isNew ? "New Prompt" : "Edit Prompt"}
        </h2>
        <div className="flex items-center gap-2">
          {!isNew && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(prompt!.id);
                    setConfirmDelete(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  <FiCheck size={12} />
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  <FiX size={12} />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 text-xs transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <FiTrash2 size={12} />
                Delete
              </button>
            )
          )}
          {!isNew && onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(prompt!.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-600 text-xs transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              <FiDuplicate size={12} />
              Duplicate
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 text-neutral-700 text-xs transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
          >
            <FiCopy size={12} />
            Copy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!text || !text.trim()}
            className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 text-xs text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-200 dark:text-black dark:hover:bg-neutral-300"
          >
            <FiSave size={12} />
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full border border-panel-border bg-panel-2 px-3 py-2 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1">
          <label className="font-medium text-neutral-700 text-sm dark:text-neutral-300">
            Prompt Content
          </label>
          <textarea
            ref={textAreaRef}
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              resizeTextArea();
            }}
            placeholder="Enter your prompt text..."
            className="min-h-[200px] w-full resize-none overflow-hidden border border-panel-border bg-panel-2 px-3 py-2 font-mono text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-neutral-100"
          />
        </div>
      </div>
    </div>
  );
}
