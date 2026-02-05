import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { usePromptManager } from "@/contexts/PromptManagerContext";
import { AppConfig } from "@/schemas/schemas.ts";
import { useTheme } from "@/contexts/ThemeContext.tsx";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { config, saveConfig, refresh, syncVaultNow } = usePromptManager();
  const { theme, setTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<
    {
      found: number;
      updated: number;
      deleted: number;
    } | null
  >(null);

  const handleBrowseVault = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Vault Directory",
    });

    if (selected && typeof selected === "string") {
      const newConfig: AppConfig = {
        ...config,
        vaultPath: selected,
        theme: config?.theme || "dark",
      };
      await saveConfig(newConfig);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const stats = await syncVaultNow();
      setSyncResult(stats);
    } catch (e) {
      console.error("Sync failed", e);
      alert("Sync failed: " + e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!config) return <div className="p-8">Loading config...</div>;

  const themeOptions: {
    value: "dark" | "light";
    title: string;
    description: string;
  }[] = [
    {
      value: "dark",
      title: "Dark",
      description: "Always dark",
    },
    {
      value: "light",
      title: "Light",
      description: "Always light",
    },
  ];

  return (
    <div className="flex min-h-full w-full flex-col bg-main-background">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Preferences
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            Settings
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-500">
            Tune how Prompt Manager stores your data and presents itself.
          </p>
        </div>
        <div className="rounded-full border border-panel-border bg-panel px-4 py-2 text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          Theme: {theme === "dark" ? "Dark" : "Light"}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6 rounded-2xl border border-panel-border bg-panel p-6 text-neutral-900 dark:text-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Vault Configuration
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-500">
              Choose where prompt files are stored and keep the cache aligned.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-panel-border bg-panel-2 p-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                Vault Path
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={config.vaultPath || ""}
                  placeholder="No vault configured (Read Only Mode)"
                  className="flex-1 rounded-lg border border-panel-border bg-panel px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-neutral-200"
                />
                <button
                  onClick={handleBrowseVault}
                  className="rounded-lg border border-panel-border bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 dark:bg-neutral-900"
                >
                  Browse Vault
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                Prompts are stored as Markdown files in this folder.
              </p>
            </div>

            {config.vaultPath && (
              <div className="rounded-lg border border-panel-border bg-panel p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Force Synchronization
                    </h3>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-500">
                      Re-scan the vault and update the local cache.
                    </p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isSyncing
                        ? "cursor-not-allowed bg-blue-500/20 text-blue-300"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    {isSyncing ? "Syncing..." : "Sync Vault"}
                  </button>
                </div>
              </div>
            )}

            {syncResult && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <p className="font-semibold">Sync Complete</p>
                <ul className="mt-2 space-y-1 text-xs text-emerald-200/80">
                  <li>Found: {syncResult.found} files</li>
                  <li>Updated: {syncResult.updated} files in cache</li>
                  <li>Deleted: {syncResult.deleted} orphaned entries</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6 rounded-2xl border border-panel-border bg-panel p-6 text-neutral-900 dark:text-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Appearance
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-500">
              Pick a theme that feels right for your workspace.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              <span>Theme</span>
              <span className="text-neutral-400">
                Current: {theme === "dark" ? "Dark" : "Light"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {themeOptions.map((option) => {
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={isActive}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-100"
                        : "border-panel-border bg-panel-2 text-neutral-900 hover:border-neutral-500/60 hover:bg-panel dark:text-neutral-200"
                    }`}
                  >
                    <div className="font-semibold">{option.title}</div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  );
}
