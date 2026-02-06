import { z } from "zod";

export const PromptSchema = z.object({
  id: z.string(),
  created: z.string().nullable(),
  text: z.string(),
  tags: z.array(z.string()),
  filePath: z.string().nullable().optional(),
  previousFilePath: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

export type Prompt = z.infer<typeof PromptSchema>;

export const ViewConfigSchema = z.object({
  filter: z.object({
    tags: z.array(z.string()).optional(),
    search: z.string().optional(),
    favorite: z.boolean().optional(),
  }).optional(),
  sort: z.object({
    by: z.enum(["created"]),
    order: z.enum(["asc", "desc"]),
  }).optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["system", "custom"]),
  config: ViewConfigSchema,
  created: z.string(),
});

export type View = z.infer<typeof ViewSchema>;

export const AppConfigSchema = z.object({
  vaultPath: z.string().nullable(),
  theme: z.string(),
  view: z.object({
    showPromptTitles: z.boolean(),
    showFullPrompt: z.boolean(),
    showPromptTags: z.boolean(),
    showCreatedDate: z.boolean(),
  }),
  frontmatter: z.object({
    promptTagsProperty: z.string(),
    addPromptsTagToTags: z.boolean(),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const PromptFileSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  tags: z.array(z.string()),
  created: z.string().nullable(),
  content: z.string(),
  fileHash: z.string().nullable().optional(),
});

export type PromptFile = z.infer<typeof PromptFileSchema>;
