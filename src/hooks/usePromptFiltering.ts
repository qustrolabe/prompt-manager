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
        result = result.filter((p) => p.text.toLowerCase().includes(lower));
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
        let valA: string = "";
        let valB: string = "";

        if (sort.by === "created") {
          valA = a.created || "";
          valB = b.created || "";
        }

        if (valA < valB) return sort.order === "asc" ? -1 : 1;
        if (valA > valB) return sort.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [prompts, config]);
}
