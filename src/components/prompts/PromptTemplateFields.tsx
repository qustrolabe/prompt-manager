interface PromptTemplateFieldsProps {
  keywords: string[];
  templateValues: Record<string, string>;
  onKeywordChange: (keyword: string, value: string) => void;
}

export function PromptTemplateFields({
  keywords,
  templateValues,
  onKeywordChange,
}: PromptTemplateFieldsProps) {
  if (keywords.length === 0) return null;

  return (
    <div>
      <label className="mb-2 block font-medium text-neutral-700 text-sm dark:text-neutral-300">
        Template Fields
      </label>
      <div className="space-y-2 border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
        {keywords.map((keyword) => (
          <div key={keyword} className="flex items-center gap-2">
            <span className="w-28 truncate font-mono text-blue-700 text-xs dark:text-blue-300">
              {"{{"}
              {keyword}
              {"}}"}
            </span>
            <input
              type="text"
              value={templateValues[keyword] || ""}
              onChange={(e) =>
                onKeywordChange(keyword, e.target.value)}
              placeholder={`Value for ${keyword}`}
              className="flex-1 border border-blue-200 bg-white px-2 py-1 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none dark:border-blue-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
