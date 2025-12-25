import { z } from "zod";

export const PromptModeSchema = z.enum(['raw', 'template']);
export type PromptMode = z.infer<typeof PromptModeSchema>;

export const PromptSchema = z.object({
  id: z.uuid(),
  createdAt: z.date().nullable(),
  title: z.string().nullable(),           // Optional title
  text: z.string(),                        // The prompt content
  description: z.string().nullable(),      // Optional description
  tags: z.array(z.string()),               // Tags for categorization
  mode: PromptModeSchema,                  // Raw text or template with {{keywords}}

  // Template field values - stores the current input values for {{keywords}}
  templateValues: z.record(z.string(), z.string()).optional(),

  // Future: for linking generated images to prompts
  // generatedImagesIds: z.array(UUID),
  // inputImages: z.array(z.url()),
});

export type Prompt = z.infer<typeof PromptSchema>;

export const SnippetSchema = z.object({
  id: z.uuid(),
  createdAt: z.date().nullable(),
  value: z.string(),                       // The snippet text/word
  description: z.string().nullable(),      // Description of the snippet
  tags: z.array(z.string()),               // Tags (shared pool with prompts)
});

export type Snippet = z.infer<typeof SnippetSchema>;

export const ViewConfigSchema = z.object({
  filter: z.object({
    tags: z.array(z.string()).optional(),
    search: z.string().optional(),
    favorite: z.boolean().optional(),
  }).optional(),
  sort: z.object({
    by: z.enum(["created_at", "title", "usage_count"]),
    order: z.enum(["asc", "desc"]),
  }).optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["system", "custom"]),
  config: ViewConfigSchema,
  createdAt: z.date(),
});

export type View = z.infer<typeof ViewSchema>;