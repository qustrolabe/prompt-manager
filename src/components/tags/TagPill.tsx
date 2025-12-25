interface TagPillProps {
  tag: string;
  onRemove: (tag: string) => void;
}

export function TagPill({ tag, onRemove }: TagPillProps) {
  const isNegative = tag.startsWith("-");

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
        isNegative
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
      }`}
    >
      {tag}
      <button
        type="button"
        onClick={() => onRemove(tag)}
        className={`transition-colors ml-0.5 ${
          isNegative
            ? "hover:text-red-900 dark:hover:text-red-100"
            : "hover:text-red-500"
        }`}
      >
        ×
      </button>
    </span>
  );
}
