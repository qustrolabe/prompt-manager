/**
 * SQLite-based Prompt Manager Service using Drizzle ORM
 */

import { getDrizzle } from "@/db/client.ts";
import {
    prompts,
    promptTags,
    promptTemplateValues,
    snippets,
    snippetTags,
    tags,
    views
} from "@/db/schema.ts";
import { eq, desc, asc } from "drizzle-orm";
import { Prompt, Snippet, View, ViewConfig } from "@/schemas/schemas.ts";

class SqlitePromptManagerService {
    // ============================================================
    // PROMPTS
    // ============================================================

    async getPrompts(options?: {
        filter?: ViewConfig['filter'];
        sort?: ViewConfig['sort'];
    }): Promise<Prompt[]> {
        const db = await getDrizzle();

        // Basic fetch - in a real app with large data, we'd apply filters in DB.
        // For now, fetching all and filtering in-memory is cleaner for the complex tag logic
        // unless we want to build complex dynamic queries.
        const results = await db.query.prompts.findMany({
            with: {
                promptTags: {
                    with: {
                        tag: true
                    }
                },
                templateValues: true
            }
        });

        let mappedPrompts = results.map(row => {
            const templateVals = row.templateValues.reduce((acc, tv) => {
                acc[tv.keyword] = tv.value;
                return acc;
            }, {} as Record<string, string>);

            return {
                id: row.id as any,
                createdAt: row.createdAt,
                title: row.title,
                text: row.text,
                description: row.description,
                mode: row.mode as "raw" | "template",
                tags: row.promptTags.map(pt => pt.tag.name),
                templateValues: Object.keys(templateVals).length > 0 ? templateVals : undefined,
            };
        });

        // Apply filters
        if (options?.filter) {
            const { tags, search, favorite } = options.filter;

            if (tags && tags.length > 0) {
                mappedPrompts = mappedPrompts.filter(p =>
                    tags.every(t => p.tags.includes(t)) // AND logic: prompt must have all filter tags
                );
            }

            if (search) {
                const lowerSearch = search.toLowerCase();
                mappedPrompts = mappedPrompts.filter(p =>
                    p.text.toLowerCase().includes(lowerSearch) ||
                    p.title?.toLowerCase().includes(lowerSearch) ||
                    p.description?.toLowerCase().includes(lowerSearch)
                );
            }

            // 'favorite' is not in schema yet, ignoring
        }

        // Apply sort
        if (options?.sort) {
            const { by, order } = options.sort;
            mappedPrompts.sort((a, b) => {
                let valA: any = a[by as keyof Prompt];
                let valB: any = b[by as keyof Prompt];

                // Handle special cases or defaults
                if (by === 'usage_count') return 0; // Not implemented yet
                if (by === 'created_at') {
                    valA = a.createdAt?.getTime() ?? 0;
                    valB = b.createdAt?.getTime() ?? 0;
                }
                if (by === 'title') {
                    valA = a.title ?? '';
                    valB = b.title ?? '';
                }

                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort: Created At Desc
            mappedPrompts.sort((a, b) =>
                (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
            );
        }

        return mappedPrompts;
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        const db = await getDrizzle();

        // Upsert the prompt
        await db.insert(prompts)
            .values({
                id: prompt.id,
                createdAt: prompt.createdAt,
                title: prompt.title,
                text: prompt.text,
                description: prompt.description,
                mode: prompt.mode,
            })
            .onConflictDoUpdate({
                target: prompts.id,
                set: {
                    title: prompt.title,
                    text: prompt.text,
                    description: prompt.description,
                    mode: prompt.mode,
                }
            });

        // Delete existing tags for this prompt
        await db.delete(promptTags).where(eq(promptTags.promptId, prompt.id));

        // Insert tags
        for (const tagName of prompt.tags) {
            const tagId = await this.getOrCreateTag(db, tagName);
            await db.insert(promptTags)
                .values({
                    promptId: prompt.id,
                    tagId: tagId
                })
                .onConflictDoNothing();
        }

        // Delete existing template values
        await db.delete(promptTemplateValues).where(eq(promptTemplateValues.promptId, prompt.id));

        // Insert template values if present
        if (prompt.templateValues) {
            for (const [keyword, value] of Object.entries(prompt.templateValues)) {
                await db.insert(promptTemplateValues)
                    .values({
                        promptId: prompt.id,
                        keyword,
                        value
                    });
            }
        }
    }

    async deletePrompt(id: string): Promise<void> {
        const db = await getDrizzle();
        await db.delete(prompts).where(eq(prompts.id, id));
    }

    async duplicatePrompt(id: string): Promise<Prompt | null> {
        const db = await getDrizzle();
        const promptToDuplicate = (await this.getPrompts()).find(p => p.id === id);

        if (!promptToDuplicate) return null;

        const newPrompt: Prompt = {
            ...promptToDuplicate,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            title: promptToDuplicate.title ? `${promptToDuplicate.title} (Copy)` : null,
        };

        await this.savePrompt(newPrompt);
        return newPrompt;
    }

    // ============================================================
    // SNIPPETS
    // ============================================================

    async getSnippets(): Promise<Snippet[]> {
        const db = await getDrizzle();

        const results = await db.query.snippets.findMany({
            orderBy: (snippets, { desc }) => [desc(snippets.createdAt)],
            with: {
                snippetTags: {
                    with: {
                        tag: true
                    }
                },
            }
        });

        return results.map(row => ({
            id: row.id as any,
            createdAt: row.createdAt,
            value: row.value,
            description: row.description,
            tags: row.snippetTags.map(st => st.tag.name),
        }));
    }

    async saveSnippet(snippet: Snippet): Promise<void> {
        const db = await getDrizzle();

        await db.insert(snippets)
            .values({
                id: snippet.id,
                createdAt: snippet.createdAt,
                value: snippet.value,
                description: snippet.description,
            })
            .onConflictDoUpdate({
                target: snippets.id,
                set: {
                    value: snippet.value,
                    description: snippet.description,
                }
            });

        await db.delete(snippetTags).where(eq(snippetTags.snippetId, snippet.id));

        const tagIds = await Promise.all(
            snippet.tags.map(tagName => this.getOrCreateTag(db, tagName))
        );

        if (tagIds.length > 0) {
            await db.insert(snippetTags).values(
                tagIds.map(tagId => ({ snippetId: snippet.id, tagId }))
            ).onConflictDoNothing();
        }
    }

    async deleteSnippet(id: string): Promise<void> {
        const db = await getDrizzle();
        await db.delete(snippets).where(eq(snippets.id, id));
    }

    // ============================================================
    // VIEWS
    // ============================================================

    async getViews(): Promise<View[]> {
        const db = await getDrizzle();
        const results = await db.select().from(views).orderBy(desc(views.createdAt));

        return results.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type as "system" | "custom",
            config: row.config as ViewConfig,
            createdAt: row.createdAt,
        }));
    }

    async saveView(view: View): Promise<void> {
        const db = await getDrizzle();
        await db.insert(views)
            .values({
                id: view.id,
                name: view.name,
                type: view.type,
                config: view.config,
                createdAt: view.createdAt,
            })
            .onConflictDoUpdate({
                target: views.id,
                set: {
                    name: view.name,
                    config: view.config
                }
            });
    }

    async deleteView(id: string): Promise<void> {
        const db = await getDrizzle();
        await db.delete(views).where(eq(views.id, id));
    }

    async getViewById(id: string): Promise<View | undefined> {
        const db = await getDrizzle();
        const result = await db.select().from(views).where(eq(views.id, id)).limit(1);

        if (result.length === 0) return undefined;

        const row = result[0];
        return {
            id: row.id,
            name: row.name,
            type: row.type as "system" | "custom",
            config: row.config as ViewConfig,
            createdAt: row.createdAt,
        };
    }

    // ============================================================
    // TAGS
    // ============================================================

    async getAllTags(): Promise<string[]> {
        const db = await getDrizzle();
        const results = await db.select({ name: tags.name })
            .from(tags)
            .orderBy(tags.name);
        return results.map(r => r.name);
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    private async getOrCreateTag(tx: any, tagName: string): Promise<string> {
        const existing = await tx.select({ id: tags.id })
            .from(tags)
            .where(eq(tags.name, tagName))
            .limit(1);

        if (existing.length > 0) {
            return existing[0].id;
        }

        const id = crypto.randomUUID();
        await tx.insert(tags)
            .values({
                id,
                name: tagName
            });

        return id;
    }
}

export interface IPromptManagerService {
    // Prompts
    getPrompts(options?: { filter?: ViewConfig['filter']; sort?: ViewConfig['sort'] }): Promise<Prompt[]>;
    savePrompt(prompt: Prompt): Promise<void>;
    deletePrompt(id: string): Promise<void>;
    duplicatePrompt(id: string): Promise<Prompt | null>;

    // Snippets
    getSnippets(): Promise<Snippet[]>;
    saveSnippet(snippet: Snippet): Promise<void>;
    deleteSnippet(id: string): Promise<void>;

    // Views
    getViews(): Promise<View[]>;
    saveView(view: View): Promise<void>;
    deleteView(id: string): Promise<void>;
    getViewById(id: string): Promise<View | undefined>;

    // Tags
    getAllTags(): Promise<string[]>;
}

export const promptManagerService = new SqlitePromptManagerService();

