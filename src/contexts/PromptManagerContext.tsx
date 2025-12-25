import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Prompt, Snippet, View } from "@/schemas/schemas.ts";
import { promptManagerService } from "@/services/PromptManagerService.ts";

interface PromptManagerContextType {
  // Prompts
  prompts: Prompt[]; // All prompts
  addPrompt: (prompt: Prompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  duplicatePrompt: (id: string) => Promise<Prompt | null>;

  // Snippets
  snippets: Snippet[];
  addSnippet: (snippet: Snippet) => Promise<void>;
  updateSnippet: (snippet: Snippet) => Promise<void>;
  removeSnippet: (id: string) => Promise<void>;

  // Views
  views: View[];
  addView: (view: View) => Promise<void>;
  updateView: (view: View) => Promise<void>;
  removeView: (id: string) => Promise<void>;
  getViewById: (id: string) => Promise<View | undefined>;

  // Tags
  allTags: string[];

  // Loading state
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const PromptManagerContext = createContext<
  PromptManagerContextType | undefined
>(undefined);

export function PromptManagerProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedPrompts, loadedSnippets, loadedViews, tags] = await Promise
        .all([
          promptManagerService.getPrompts(),
          promptManagerService.getSnippets(),
          promptManagerService.getViews(),
          promptManagerService.getAllTags(),
        ]);

      // Sort by createdAt desc
      loadedPrompts.sort((a: Prompt, b: Prompt) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });

      loadedSnippets.sort((a: Snippet, b: Snippet) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });

      setPrompts(loadedPrompts);
      setSnippets(loadedSnippets);
      setViews(loadedViews);
      setAllTags(tags);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Prompt operations
  const addPrompt = async (prompt: Prompt) => {
    await promptManagerService.savePrompt(prompt);
    await refresh();
  };

  const updatePrompt = async (prompt: Prompt) => {
    await promptManagerService.savePrompt(prompt);
    await refresh();
  };

  const removePrompt = async (id: string) => {
    await promptManagerService.deletePrompt(id);
    await refresh();
  };

  const duplicatePrompt = async (id: string): Promise<Prompt | null> => {
    const duplicate = await promptManagerService.duplicatePrompt(id);
    await refresh();
    return duplicate;
  };

  // Snippet operations
  const addSnippet = async (snippet: Snippet) => {
    await promptManagerService.saveSnippet(snippet);
    await refresh();
  };

  const updateSnippet = async (snippet: Snippet) => {
    await promptManagerService.saveSnippet(snippet);
    await refresh();
  };

  const removeSnippet = async (id: string) => {
    await promptManagerService.deleteSnippet(id);
    await refresh();
  };

  // View operations
  const addView = async (view: View) => {
    await promptManagerService.saveView(view);
    await refresh();
  };

  const updateView = async (view: View) => {
    await promptManagerService.saveView(view);
    await refresh();
  };

  const removeView = async (id: string) => {
    await promptManagerService.deleteView(id);
    await refresh();
  };

  const getViewById = async (id: string) => {
    // If we have it in state, return it, otherwise fetch (though state should be source of truth for UI)
    const found = views.find((v) => v.id === id);
    if (found) return found;
    return await promptManagerService.getViewById(id);
  };

  return (
    <PromptManagerContext.Provider
      value={{
        prompts,
        addPrompt,
        updatePrompt,
        removePrompt,
        duplicatePrompt,
        snippets,
        addSnippet,
        updateSnippet,
        removeSnippet,
        views,
        addView,
        updateView,
        removeView,
        getViewById,
        allTags,
        isLoading,
        refresh,
      }}
    >
      {children}
    </PromptManagerContext.Provider>
  );
}

export function usePromptManager() {
  const context = useContext(PromptManagerContext);
  if (context === undefined) {
    throw new Error(
      "usePromptManager must be used within a PromptManagerProvider",
    );
  }
  return context;
}
