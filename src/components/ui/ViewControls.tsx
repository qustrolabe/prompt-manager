import { ViewConfig } from "@/schemas/schemas.ts";
import { FiArrowDown, FiArrowUp, FiFilter, FiSearch } from "react-icons/fi";
import { TagInput } from "@/components/tags/TagInput.tsx";

interface ViewControlsProps {
  config: ViewConfig;
  onChange: (newConfig: ViewConfig) => void;
  allTags: string[];
}

export function ViewControls({ config, onChange, allTags }: ViewControlsProps) {
  const handleSearchChange = (val: string) => {
    onChange({
      ...config,
      filter: { ...config.filter, search: val },
    });
  };

  const handleTagsChange = (tags: string[]) => {
    onChange({
      ...config,
      filter: { ...config.filter, tags },
    });
  };

  const handleSortChange = (by: "created") => {
    // Toggle order if clicking same sort field
    const currentOrder = config.sort?.order || "desc";
    // Safe check for config.sort
    const isSameSort = config.sort && config.sort.by === by;
    const newOrder = isSameSort && currentOrder === "desc" ? "asc" : "desc";

    onChange({
      ...config,
      sort: { by, order: newOrder },
    });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-panel-border bg-panel-2 p-3">
      {/* Top Row: Search and some actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={config.filter?.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-panel-border bg-panel px-9 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-blue-400"
          />
        </div>
        {/* Sort Controls */}
        <div className="flex gap-1 rounded-md border border-panel-border bg-panel p-1 dark:bg-neutral-800">
          <button
            onClick={() => handleSortChange("created")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              config.sort?.by === "created"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Sort by Date"
          >
            Date
            {config.sort?.by === "created" && (
              config.sort.order === "asc" ? <FiArrowUp /> : <FiArrowDown />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Row: Filters (Tags) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-sm text-neutral-500">
          <FiFilter className="mr-1" />
          Filters:
        </div>
        <div className="flex-1">
          <TagInput
            tags={config.filter?.tags || []}
            onChange={handleTagsChange}
            suggestions={allTags}
            placeholder="Filter by tags..."
            enableNegativeTags={true}
          />
        </div>
      </div>
    </div>
  );
}
