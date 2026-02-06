import { SidebarViews } from "./SidebarViews.tsx";
import { SidebarFooter } from "./SidebarFooter.tsx";
import { useSidebar } from "@/contexts/SidebarContext.tsx";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { useViewConfig } from "@/contexts/ViewConfigContext.tsx";
import { useViewManagement } from "@/hooks/useViewManagement.ts";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FiGrid, FiTag, FiEye, FiTerminal } from "react-icons/fi";

export function Sidebar() {
  const { isOpen } = useSidebar();
  const { allTags, views, updateView } = usePromptManager();
  const { viewPrompts } = useViewConfig();
  const [activeTab, setActiveTab] = useState<"main" | "tags" | "views">("main");
  const location = useRouterState({ select: (state) => state.location });
  const viewId = useMemo(() => {
    if (location.pathname !== "/main_view") return undefined;
    const params = new URLSearchParams(location.search);
    const raw = params.get("viewId");
    return raw || undefined;
  }, [location.pathname, location.search]);
  const isAllPromptsActive = location.pathname === "/main_view" && !viewId;
  const { currentConfig, handleConfigChange } = useViewManagement({
    viewId,
    views,
    updateView,
  });

  const filterTags = currentConfig.filter?.tags || [];
  const { positiveTags, negativeTags } = useMemo(() => {
    const positives = new Set<string>();
    const negatives = new Set<string>();
    for (const tag of filterTags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("-")) {
        const raw = trimmed.slice(1).trim();
        if (raw) negatives.add(raw);
      } else {
        positives.add(trimmed);
      }
    }
    return { positiveTags: positives, negativeTags: negatives };
  }, [filterTags]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const prompt of viewPrompts) {
      for (const tag of prompt.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [viewPrompts]);

  const visibleTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const prompt of viewPrompts) {
      for (const tag of prompt.tags) {
        tagSet.add(tag);
      }
    }
    for (const tag of filterTags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("-")) {
        const raw = trimmed.slice(1).trim();
        if (raw) tagSet.add(raw);
      } else {
        tagSet.add(trimmed);
      }
    }
    return [...tagSet];
  }, [filterTags, viewPrompts]);

  const sortedTags = useMemo(() => {
    const tags = visibleTags.length > 0 ? [...visibleTags] : [...allTags];
    tags.sort((a, b) => {
      const rank = (tag: string) => {
        if (positiveTags.has(tag)) return 0;
        if (negativeTags.has(tag)) return 1;
        return 2;
      };
      const rankA = rank(a);
      const rankB = rank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    });
    return tags;
  }, [allTags, negativeTags, positiveTags, visibleTags]);

  const updateFilterTags = (nextTags: string[]) => {
    handleConfigChange({
      ...currentConfig,
      filter: { ...currentConfig.filter, tags: nextTags },
    });
  };

  const toggleTag = (
    tag: string,
    mode: "positive" | "negative",
    options?: { allowSwitch?: boolean },
  ) => {
    const normalized = tag.trim();
    if (!normalized) return;

    const positiveValue = normalized;
    const negativeValue = `-${normalized}`;
    const isPositive = positiveTags.has(normalized);
    const isNegative = negativeTags.has(normalized);

    let next = filterTags.filter(
      (t) => t !== positiveValue && t !== negativeValue,
    );

    if (mode === "positive") {
      if (!isPositive && (!isNegative || options?.allowSwitch)) {
        next = [positiveValue, ...next];
      }
    } else if (!isNegative) {
      next = [negativeValue, ...next];
    }

    updateFilterTags(next);
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden border-panel-border border-r bg-panel text-sm transition-all duration-300 ${
        isOpen
          ? "w-64 opacity-100"
          : "pointer-events-none w-0 opacity-0"
      }`}
    >
      <div className="flex h-full min-w-[16rem] flex-col">
        <div className="px-2 pt-2">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-panel-2 p-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
            {[
              { id: "main", label: "Main", icon: <FiGrid size={12} /> },
              { id: "tags", label: "Tags", icon: <FiTag size={12} /> },
              { id: "views", label: "Views", icon: <FiEye size={12} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                  activeTab === tab.id
                    ? "bg-panel text-neutral-900 dark:text-neutral-100"
                    : "hover:bg-panel text-neutral-500"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {activeTab === "main" && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 px-2 text-xs font-medium uppercase text-neutral-500">
                  Navigation
                </div>
                <div className="space-y-1">
                  <Link
                    to="/main_view"
                    className={isAllPromptsActive
                      ? "flex w-full items-center gap-2 rounded-md px-2 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "flex w-full items-center gap-2 rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"}
                  >
                    <FiGrid />
                    All Prompts
                  </Link>
                  <Link
                    to="/debug"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 [&.active]:bg-blue-50 [&.active]:text-blue-600 dark:[&.active]:bg-blue-900/20 dark:[&.active]:text-blue-400"
                  >
                    <FiTerminal />
                    Debug
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tags" && (
            <div>
              <div className="mb-2 px-2 text-xs font-medium uppercase text-neutral-500">
                Tags
              </div>
              <div className="space-y-1">
                {allTags.length === 0 && (
                  <div className="px-2 text-xs text-neutral-500">
                    No tags yet.
                  </div>
                )}
                {sortedTags.map((tag) => {
                  const isPositive = positiveTags.has(tag);
                  const isNegative = negativeTags.has(tag);
                  const count = tagCounts.get(tag) ?? 0;

                  return (
                    <div
                      key={tag}
                      role="button"
                      tabIndex={0}
                      onClick={(event) =>
                        toggleTag(tag, event.shiftKey ? "negative" : "positive")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleTag(tag, "positive");
                        }
                      }}
                      className={`group flex w-full select-none items-center gap-2 rounded-md border px-2 py-2 text-left text-neutral-700 transition dark:text-neutral-300 ${
                        isPositive
                          ? "border-emerald-500 bg-emerald-200 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-100"
                          : isNegative
                          ? "border-rose-500 bg-rose-200 text-rose-950 dark:border-rose-300 dark:bg-rose-500/25 dark:text-rose-100"
                          : "border-transparent hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-700/80 dark:hover:text-neutral-100"
                      }`}
                      title={isPositive
                        ? "Click to remove; shift-click to exclude"
                        : isNegative
                        ? "Click to remove; click to include"
                        : "Click to include; shift-click to exclude"}
                    >
                      <FiTag size={12} />
                      <span className={`truncate ${
                        isPositive
                          ? "text-emerald-950 dark:text-emerald-100"
                          : isNegative
                          ? "text-rose-950 dark:text-rose-100"
                          : ""
                      }`}
                      >
                        {tag}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className={`text-[10px] tabular-nums ${
                          isPositive
                            ? "text-emerald-900/80 dark:text-emerald-100/80"
                            : isNegative
                            ? "text-rose-900/80 dark:text-rose-100/80"
                            : "text-neutral-500 dark:text-neutral-400"
                        }`}
                        >
                          {count}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTag(tag, "positive", { allowSwitch: true });
                            }}
                            className={`rounded px-1 text-xs ${
                              isPositive
                                ? "bg-emerald-400 text-emerald-950 dark:bg-emerald-400/70 dark:text-emerald-950"
                                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                            }`}
                            title="Include tag"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTag(tag, "negative", { allowSwitch: true });
                            }}
                            className={`rounded px-1 text-xs ${
                              isNegative
                                ? "bg-rose-400 text-rose-950 dark:bg-rose-400/70 dark:text-rose-950"
                                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                            }`}
                            title="Exclude tag"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "views" && <SidebarViews />}
        </div>

        {/* Bottom panel */}
        <div className="border-panel-border border-t p-2">
          <SidebarFooter />
        </div>
      </div>
    </div>
  );
}
