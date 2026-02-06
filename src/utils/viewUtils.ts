
import { ViewConfig } from "@/schemas/schemas.ts";

export function formatViewConfig(config: ViewConfig): string {
    const parts: string[] = [];

    // Format tags: #tag1 #tag2
    if (config.filter?.tags?.length) {
        parts.push(config.filter.tags.map((tag) => {
            const trimmed = tag.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith("-")) {
                const raw = trimmed.slice(1);
                const normalized = raw.startsWith("#") ? raw : `#${raw}`;
                return `-${normalized}`;
            }
            return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
        }).filter(Boolean).join(" "));
    }

    // Format sort: sort_desc:created_at
    if (config.sort) {
        parts.push(`sort_${config.sort.order}:${config.sort.by}`);
    }

    return parts.join(" ") || "Untitled View";
}
