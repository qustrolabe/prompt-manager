import { useEffect, useState } from "react";
import { Snippet } from "@/schemas/schemas.ts";
import { TagInput } from "@/components/tags/TagInput.tsx";
import { FiCopy, FiSave, FiTrash2, FiX } from "react-icons/fi";

interface SnippetEditOverlayProps {
  snippet: Snippet | null;
  isNew: boolean;
  allTags: string[];
  onSave: (snippet: Snippet) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function SnippetEditOverlay({
  snippet,
  isNew,
  allTags,
  onSave,
  onDelete,
  onClose,
}: SnippetEditOverlayProps) {
  const [value, setValue] = useState(snippet?.value || "");
  const [description, setDescription] = useState(snippet?.description || "");
  const [tags, setTags] = useState<string[]>(snippet?.tags || []);

  // Reset form when snippet changes
  useEffect(() => {
    if (snippet) {
      setValue(snippet.value || "");
      setDescription(snippet.description || "");
      setTags(snippet.tags || []);
    } else {
      setValue("");
      setDescription("");
      setTags([]);
    }
  }, [snippet]);

  const handleSave = () => {
    const updatedSnippet: Snippet = {
      id: snippet?.id || (crypto.randomUUID() as any),
      createdAt: snippet?.createdAt || new Date(),
      value: (value || "").trim(),
      description: description.trim() || null,
      tags,
    };
    onSave(updatedSnippet);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-panel w-full max-w-lg max-h-[80vh] shadow-2xl border border-panel-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-panel-border">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isNew ? "New Snippet" : "Edit Snippet"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Value
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter snippet text or word..."
              className="w-full px-3 py-2 bg-panel-2 border border-panel-border text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this snippet..."
              className="w-full px-3 py-2 bg-panel-2 border border-panel-border text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[80px] resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
        <div className="flex items-center justify-between gap-2 p-4 border-t border-panel-border bg-panel-2">
          <div className="flex gap-2">
            {!isNew && onDelete && (
              <button
                onClick={() => onDelete(snippet!.id)}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
              >
                <FiTrash2 size={14} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <FiCopy size={14} />
              Copy
            </button>
            <button
              onClick={handleSave}
              disabled={!value || !value.trim()}
              className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
