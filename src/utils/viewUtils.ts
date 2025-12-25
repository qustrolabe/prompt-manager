
import { ViewConfig } from "@/schemas/schemas.ts";

export function formatViewConfig(config: ViewConfig): string {
    const parts: string[] = [];

    // Format tags: #tag1 #tag2
    if (config.filter?.tags?.length) {
        parts.push(config.filter.tags.map(t => t.startsWith("#") ? t : `#${t}`).join(" "));
    }

    // Format sort: sort_desc:created_at
    if (config.sort) {
        parts.push(`sort_${config.sort.order}:${config.sort.by}`);
    }

    return parts.join(" ") || "Untitled View";
}
