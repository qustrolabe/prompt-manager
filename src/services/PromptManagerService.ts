/**
 * Rust-backed PromptManagerService using Tauri Commands via Specta bindings
 */

import {
  commands,
  Prompt as RsPrompt,
  PromptInput as RsPromptInput,
  Snippet as RsSnippet,
  SnippetInput as RsSnippetInput,
  View as RsView,
  ViewConfig as RsViewConfig,
  ViewInput as RsViewInput,
} from "@/bindings";
import { Prompt, Snippet, View, ViewConfig } from "@/schemas/schemas";

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
  // PROMPTS
  // ============================================================

  async getPrompts(options?: {
    filter?: ViewConfig["filter"];
    sort?: ViewConfig["sort"];
  }): Promise<Prompt[]> {
    // Convert options to Rust compatible format if needed
    // The bindings expect strict types, and our ViewConfig in schema.ts matches RsViewConfig structure mostly
    // but optional fields might need ensuring being present or formatted correctly.
    // Thankfully Specta generates compatible structures.

    const res = await commands.getPrompts(
      options?.filter ?? null,
      options?.sort ?? null,
    );
    const data = unwrap(res);

    return data.map(this.mapPromptFromRust);
  }

  async savePrompt(prompt: Prompt): Promise<void> {
    // Cast templateValues to compatible type for Rust binding
    // The Rust binding expects Partial<{ [key: string]: string }> which allows undefined values
    // strict null checks might complain about Record<string, string> not being exactly Partial<...>
    const templateValues = prompt.templateValues as unknown as
      | Partial<{ [key in string]: string }>
      | null
      | undefined;

    const input: RsPromptInput = {
      id: prompt.id,
      createdAt: prompt.createdAt ? prompt.createdAt.getTime() : null,
      title: prompt.title,
      text: prompt.text,
      description: prompt.description,
      mode: prompt.mode,
      tags: prompt.tags,
      templateValues: templateValues ?? null,
    };

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
  // SNIPPETS
  // ============================================================

  async getSnippets(): Promise<Snippet[]> {
    const res = await commands.getSnippets();
    const data = unwrap(res);
    return data.map(this.mapSnippetFromRust);
  }

  async saveSnippet(snippet: Snippet): Promise<void> {
    const input: RsSnippetInput = {
      id: snippet.id,
      createdAt: snippet.createdAt ? snippet.createdAt.getTime() : null,
      value: snippet.value,
      description: snippet.description,
      tags: snippet.tags,
    };

    const res = await commands.saveSnippet(input);
    unwrap(res);
  }

  async deleteSnippet(id: string): Promise<void> {
    const res = await commands.deleteSnippet(id);
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
      config: view.config as RsViewConfig, // Cast assuming structure compatibility
      createdAt: view.createdAt.getTime(),
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
  // HELPERS
  // ============================================================

  private mapPromptFromRust(p: RsPrompt): Prompt {
    return {
      id: p.id,
      createdAt: p.createdAt ? new Date(p.createdAt) : null,
      title: p.title,
      text: p.text,
      description: p.description,
      mode: p.mode as "raw" | "template",
      tags: p.tags,
      templateValues: (p.templateValues as Record<string, string>) ?? undefined,
    };
  }

  private mapSnippetFromRust(s: RsSnippet): Snippet {
    return {
      id: s.id,
      createdAt: s.createdAt ? new Date(s.createdAt) : null,
      value: s.value,
      description: s.description,
      tags: s.tags,
    };
  }

  private mapViewFromRust(v: RsView): View {
    return {
      id: v.id,
      name: v.name,
      type: v.type as "system" | "custom",
      config: v.config as ViewConfig,
      createdAt: new Date(v.createdAt),
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

export const promptManagerService = new TauriPromptManagerService();
