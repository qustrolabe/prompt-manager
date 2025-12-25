import { Snippet } from "@/schemas/schemas";
import { FiCopy } from "react-icons/fi";

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
  onCopy: () => void;
}

export function SnippetCard({ snippet, onClick, onCopy }: SnippetCardProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-panel border border-panel-border p-4 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-all hover:shadow-md"
    >
      {/* Header with value and actions */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {/* Value - styled distinctly */}
          <div className="inline-block px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200 dark:border-emerald-800">
            <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-200">
              {snippet.value}
            </span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Copy snippet"
          >
            <FiCopy size={14} />
          </button>
        </div>
      </div>
      
      {/* Description */}
      {snippet.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {snippet.description}
        </p>
      )}
      
      {/* Tags */}
      {snippet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {snippet.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              {tag}
            </span>
          ))}
          {snippet.tags.length > 5 && (
            <span className="text-[10px] text-neutral-500">
              +{snippet.tags.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
