import { useMemo } from "react";
import { Prompt, ViewConfig } from "@/schemas/schemas.ts";

export function usePromptFiltering(
  prompts: Prompt[],
  config: ViewConfig,
) {
  return useMemo(() => {
    let result = [...prompts];
    const { filter, sort } = config;

    if (filter) {
      if (filter.search) {
        const lower = filter.search.toLowerCase();
        result = result.filter((p) =>
          p.text.toLowerCase().includes(lower) ||
          p.title?.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower)
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        const positiveTags = filter.tags.filter((t) => !t.startsWith("-"));
        const negativeTags = filter.tags.filter((t) => t.startsWith("-")).map(
          (t) => t.slice(1),
        );

        result = result.filter((p) => {
          const hasAllPositive = positiveTags.every((t) => p.tags.includes(t));
          const hasNoNegative = negativeTags.every((t) => !p.tags.includes(t));
          return hasAllPositive && hasNoNegative;
        });
      }
    }

    if (sort) {
      result.sort((a, b) => {
        let valA: string | number = "";
        let valB: string | number = "";

        if (sort.by === "created_at") {
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        } else if (sort.by === "title") {
          valA = a.title || "";
          valB = b.title || "";
        }

        if (valA < valB) return sort.order === "asc" ? -1 : 1;
        if (valA > valB) return sort.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [prompts, config]);
}
