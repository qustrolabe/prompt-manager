/**
 * Rust-backed PromptManagerService using Tauri Commands via Specta bindings
 */

import {
  AppConfig as RsAppConfig,
  commands,
  Prompt as RsPrompt,
  PromptFile as RsPromptFile,
  PromptInput as RsPromptInput,
  SyncStats,
  View as RsView,
  ViewConfig as RsViewConfig,
  ViewInput as RsViewInput,
} from "@/bindings.ts";
import { AppConfig, Prompt, View, ViewConfig } from "@/schemas/schemas.ts";

// Helper to unwrap Tauri Result
function unwrap<T>(
  result: { status: "ok"; data: T } | { status: "error"; error: unknown },
): T {
  if (result.status === "error") {
    console.error("Database operation failed:", result.error);
    throw new Error(JSON.stringify(result.error));
  }
  return result.data;
}

class TauriPromptManagerService {
  // ============================================================
  // PROMPTS (Cache based)
  // ============================================================

  async getPrompts(options?: {
    filter?: ViewConfig["filter"];
    sort?: ViewConfig["sort"];
  }): Promise<Prompt[]> {
    const res = await commands.getPrompts(
      options?.filter ?? null,
      options?.sort ?? null,
    );
    const data = unwrap(res);

    return data.map(this.mapPromptFromRust);
  }

  async savePrompt(prompt: Prompt): Promise<void> {
    const input = {
      id: prompt.id,
      created: prompt.created,
      text: prompt.text,
      tags: prompt.tags,
      filePath: prompt.filePath ?? null,
      previousFilePath: prompt.previousFilePath ?? null,
      title: prompt.title ?? null,
      description: prompt.description ?? null,
    } as RsPromptInput;

    const res = await commands.savePrompt(input);
    unwrap(res);
  }

  async deletePrompt(id: string): Promise<void> {
    const res = await commands.deletePrompt(id);
    unwrap(res);
  }

  async duplicatePrompt(id: string): Promise<Prompt | null> {
    const res = await commands.duplicatePrompt(id);
    const data = unwrap(res);
    return data ? this.mapPromptFromRust(data) : null;
  }

  // ============================================================
  // VAULT (Direct file operations)
  // ============================================================

  async scanVault(): Promise<RsPromptFile[]> {
    const res = await commands.scanVault();
    return unwrap(res);
  }

  async readPromptFile(id: string): Promise<RsPromptFile> {
    const res = await commands.readPromptFile(id);
    return unwrap(res);
  }

  async writePromptFile(promptFile: RsPromptFile): Promise<void> {
    const res = await commands.writePromptFile(promptFile);
    unwrap(res);
  }

  async deletePromptFile(id: string): Promise<void> {
    const res = await commands.deletePromptFile(id);
    unwrap(res);
  }

  // ============================================================
  // CONFIG
  // ============================================================

  async getConfig(): Promise<AppConfig> {
    const res = await commands.getConfig();
    const data = unwrap(res);
    const frontmatter = (data as {
      frontmatter?: {
        promptTagsProperty?: string;
        addPromptsTagToTags?: boolean;
      };
    }).frontmatter;
    return {
      vaultPath: data.vaultPath,
      theme: data.theme || "dark",
      view: {
        showPromptTitles: data.view?.showPromptTitles ?? true,
        showFullPrompt: data.view?.showFullPrompt ?? false,
        showPromptTags: data.view?.showPromptTags ?? true,
        showCreatedDate: data.view?.showCreatedDate ?? true,
      },
      frontmatter: {
        promptTagsProperty: frontmatter?.promptTagsProperty?.trim() || "tags",
        addPromptsTagToTags: frontmatter?.addPromptsTagToTags ?? false,
      },
    };
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const promptTagsProperty = config.frontmatter.promptTagsProperty.trim() ||
      "tags";
    const input = {
      vaultPath: config.vaultPath,
      theme: config.theme,
      view: {
        showPromptTitles: config.view.showPromptTitles,
        showFullPrompt: config.view.showFullPrompt,
        showPromptTags: config.view.showPromptTags,
        showCreatedDate: config.view.showCreatedDate,
      },
      frontmatter: {
        promptTagsProperty,
        addPromptsTagToTags: config.frontmatter.addPromptsTagToTags,
      },
    } as RsAppConfig;
    const res = await commands.saveConfig(input);
    unwrap(res);
  }

  // ============================================================
  // VIEWS
  // ============================================================

  async getViews(): Promise<View[]> {
    const res = await commands.getViews();
    const data = unwrap(res);
    return data.map(this.mapViewFromRust);
  }

  async saveView(view: View): Promise<void> {
    const input: RsViewInput = {
      id: view.id,
      name: view.name,
      type: view.type,
      config: view.config as RsViewConfig,
      created: view.created,
    };

    const res = await commands.saveView(input);
    unwrap(res);
  }

  async deleteView(id: string): Promise<void> {
    const res = await commands.deleteView(id);
    unwrap(res);
  }

  async getViewById(id: string): Promise<View | undefined> {
    const res = await commands.getViewById(id);
    const data = unwrap(res);
    return data ? this.mapViewFromRust(data) : undefined;
  }

  // ============================================================
  // TAGS
  // ============================================================

  async getAllTags(): Promise<string[]> {
    const res = await commands.getAllTags();
    return unwrap(res);
  }

  // ============================================================
  // SYNC
  // ============================================================

  async startVaultWatch(): Promise<void> {
    const res = await commands.startVaultWatch();
    unwrap(res);
  }

  async syncVault(): Promise<SyncStats> {
    const res = await commands.syncVault();
    return unwrap(res);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private mapPromptFromRust(p: RsPrompt): Prompt {
    const withDescription = p as RsPrompt & { description?: string | null };
    return {
      id: p.id,
      created: p.created,
      text: p.text,
      tags: p.tags,
      filePath: p.filePath,
      title: p.title ?? null,
      description: withDescription.description ?? null,
    };
  }

  private mapViewFromRust(v: RsView): View {
    return {
      id: v.id,
      name: v.name,
      type: v.type as "system" | "custom",
      config: v.config as ViewConfig,
      created: v.created,
    };
  }
}

export interface IPromptManagerService {
  // Prompts
  getPrompts(
    options?: { filter?: ViewConfig["filter"]; sort?: ViewConfig["sort"] },
  ): Promise<Prompt[]>;
  savePrompt(prompt: Prompt): Promise<void>;
  deletePrompt(id: string): Promise<void>;
  duplicatePrompt(id: string): Promise<Prompt | null>;

  // Vault
  scanVault(): Promise<RsPromptFile[]>;
  readPromptFile(id: string): Promise<RsPromptFile>;
  writePromptFile(promptFile: RsPromptFile): Promise<void>;
  deletePromptFile(id: string): Promise<void>;

  // Config
  getConfig(): Promise<AppConfig>;
  saveConfig(config: AppConfig): Promise<void>;

  // Views
  getViews(): Promise<View[]>;
  saveView(view: View): Promise<void>;
  deleteView(id: string): Promise<void>;
  getViewById(id: string): Promise<View | undefined>;

  // Tags
  getAllTags(): Promise<string[]>;

  // Sync
  syncVault(): Promise<SyncStats>;
  startVaultWatch(): Promise<void>;
}

export const promptManagerService = new TauriPromptManagerService();
