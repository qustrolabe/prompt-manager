/**
 * Drizzle ORM Schema for SQLite Database
 * Normalized tables with junction tables for many-to-many relationships
 */

import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================================================
// PROMPTS
// ============================================================================

export const prompts = sqliteTable("prompts", {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    title: text("title"),
    text: text("text").notNull(),
    description: text("description"),
    mode: text("mode", { enum: ["raw", "template"] }).notNull().default("raw"),
});

export const promptsRelations = relations(prompts, ({ many }) => ({
    promptTags: many(promptTags),
    templateValues: many(promptTemplateValues),
}));

// ============================================================================
// PROMPT TEMPLATE VALUES
// ============================================================================

export const promptTemplateValues = sqliteTable(
    "prompt_template_values",
    {
        promptId: text("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
        keyword: text("keyword").notNull(),
        value: text("value").notNull(),
    },
    (t) => [primaryKey({ columns: [t.promptId, t.keyword] })]
);

export const promptTemplateValuesRelations = relations(promptTemplateValues, ({ one }) => ({
    prompt: one(prompts, {
        fields: [promptTemplateValues.promptId],
        references: [prompts.id],
    }),
}));

// ============================================================================
// SNIPPETS
// ============================================================================

export const snippets = sqliteTable("snippets", {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    value: text("value").notNull(),
    description: text("description"),
});

export const snippetsRelations = relations(snippets, ({ many }) => ({
    snippetTags: many(snippetTags),
}));

// ============================================================================
// TAGS (shared between prompts and snippets)
// ============================================================================

export const tags = sqliteTable("tags", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
    promptTags: many(promptTags),
    snippetTags: many(snippetTags),
}));

// ============================================================================
// PROMPT <-> TAG JUNCTION TABLE
// ============================================================================

export const promptTags = sqliteTable(
    "prompt_tags",
    {
        promptId: text("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
        tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    },
    (t) => [primaryKey({ columns: [t.promptId, t.tagId] })]
);

export const promptTagsRelations = relations(promptTags, ({ one }) => ({
    prompt: one(prompts, {
        fields: [promptTags.promptId],
        references: [prompts.id],
    }),
    tag: one(tags, {
        fields: [promptTags.tagId],
        references: [tags.id],
    }),
}));

// ============================================================================
// SNIPPET <-> TAG JUNCTION TABLE
// ============================================================================

export const snippetTags = sqliteTable(
    "snippet_tags",
    {
        snippetId: text("snippet_id").notNull().references(() => snippets.id, { onDelete: "cascade" }),
        tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    },
    (t) => [primaryKey({ columns: [t.snippetId, t.tagId] })]
);

export const snippetTagsRelations = relations(snippetTags, ({ one }) => ({
    snippet: one(snippets, {
        fields: [snippetTags.snippetId],
        references: [snippets.id],
    }),
    tag: one(tags, {
        fields: [snippetTags.tagId],
        references: [tags.id],
    }),
}));

// ============================================================================
// VIEWS
// ============================================================================

export const views = sqliteTable("views", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type", { enum: ["system", "custom"] }).notNull().default("custom"),
    config: text("config", { mode: "json" }).$type<{
        filter?: {
            tags?: string[];
            search?: string;
            favorite?: boolean;
        };
        sort?: {
            by: "created_at" | "title" | "usage_count";
            order: "asc" | "desc";
        };
    }>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});