import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { AppConfig, Prompt, View } from "@/schemas/schemas.ts";
import { promptManagerService } from "@/services/PromptManagerService.ts";

interface PromptManagerContextType {
  // Config
  config: AppConfig | null;
  saveConfig: (config: AppConfig) => Promise<void>;

  // Prompts
  prompts: Prompt[]; // All prompts
  addPrompt: (prompt: Prompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  removePrompt: (id: string) => Promise<void>;
  duplicatePrompt: (id: string) => Promise<Prompt | null>;

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
  lastSyncAt: string | null;
  refresh: (
    options?: { overrideConfig?: AppConfig | null; skipSync?: boolean },
  ) => Promise<void>;
  syncVaultNow: () => Promise<import("@/bindings.ts").SyncStats>;

  // Vault
  scanVault: () => Promise<void>;
}

const PromptManagerContext = createContext<
  PromptManagerContextType | undefined
>(undefined);

export function PromptManagerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refresh = useCallback(async (
    options?: { overrideConfig?: AppConfig | null; skipSync?: boolean },
  ) => {
    setIsLoading(true);
    try {
      // First ensure we have config
      let currentConfig = options?.overrideConfig ?? config;
      if (!currentConfig) {
        currentConfig = await promptManagerService.getConfig();
        setConfig(currentConfig);
      }

      // Sync with vault if configured
      if (currentConfig?.vaultPath && !options?.skipSync) {
        try {
          await promptManagerService.syncVault();
          setLastSyncAt(new Date().toISOString());
        } catch (e) {
          console.error("Auto-sync failed:", e);
        }
      }

      // If vault path is not set, we might not be able to get prompts, or we get them from cache?
      // For now, load everything
      const [loadedPrompts, loadedViews, tags] = await Promise
        .all([
          promptManagerService.getPrompts(),
          promptManagerService.getViews(),
          promptManagerService.getAllTags(),
        ]);

      // Sort by created desc
      loadedPrompts.sort((a: Prompt, b: Prompt) => {
        const da = a.created || "";
        const db = b.created || "";
        return db.localeCompare(da);
      });

      setPrompts(loadedPrompts);
      setViews(loadedViews);
      setAllTags(tags);
    } catch (e) {
      console.error("Failed to refresh data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Config
  const saveConfig = async (newConfig: AppConfig) => {
    const previousConfig = config;
    await promptManagerService.saveConfig(newConfig);
    setConfig(newConfig);
    const shouldRefreshVault = !previousConfig ||
      previousConfig.vaultPath !== newConfig.vaultPath;
    if (shouldRefreshVault) {
      await refresh({ overrideConfig: newConfig });
    }
  };

  const syncVaultNow = useCallback(async () => {
    if (!config?.vaultPath) {
      return { found: 0, updated: 0, deleted: 0 };
    }
    const stats = await promptManagerService.syncVault();
    setLastSyncAt(new Date().toISOString());
    await refresh({ overrideConfig: config, skipSync: true });
    return stats;
  }, [config, refresh]);

  useEffect(() => {
    if (!config?.vaultPath) return;

    let unlisten: (() => void) | null = null;
    let debounceTimer: number | null = null;

    promptManagerService.startVaultWatch().catch((error) => {
      console.error("Failed to start vault watcher", error);
    });

    listen("vault-changed", () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        syncVaultNow().catch((error) => {
          console.error("Failed to sync vault after change", error);
        });
      }, 300);
    }).then((stop) => {
      unlisten = stop;
    });

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      if (unlisten) unlisten();
    };
  }, [config?.vaultPath, syncVaultNow]);

  // Vault
  const scanVault = async () => {
    await promptManagerService.scanVault();
    await refresh();
  };

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
    const found = views.find((v) => v.id === id);
    if (found) return found;
    return await promptManagerService.getViewById(id);
  };

  return (
    <PromptManagerContext.Provider
      value={{
        config,
        saveConfig,
        prompts,
        addPrompt,
        updatePrompt,
        removePrompt,
        duplicatePrompt,
        views,
        addView,
        updateView,
        removeView,
        getViewById,
        allTags,
        isLoading,
        lastSyncAt,
        refresh,
        scanVault,
        syncVaultNow,
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
