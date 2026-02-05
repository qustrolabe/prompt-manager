import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { useConsoleErrors } from "@/contexts/ConsoleErrorContext.tsx";
import { Popover } from "radix-ui";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from "react-icons/vsc";
import { FiDatabase } from "react-icons/fi";

export function TitleBar() {
  const [appWindow, setAppWindow] = useState<
    Awaited<ReturnType<typeof getCurrentWindow>> | null
  >(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { prompts, lastSyncAt, config, saveConfig } = usePromptManager();
  const { hasErrors, errorCount } = useConsoleErrors();

  const lastSyncLabel = (() => {
    if (!lastSyncAt) return "Never";
    const deltaMs = new Date(lastSyncAt).getTime() - now;
    const deltaSeconds = Math.round(deltaMs / 1000);
    const absSeconds = Math.abs(deltaSeconds);
    if (absSeconds < 60) return "Just now";

    const units = [
      { unit: "minute", seconds: 60 },
      { unit: "hour", seconds: 60 * 60 },
      { unit: "day", seconds: 60 * 60 * 24 },
      { unit: "week", seconds: 60 * 60 * 24 * 7 },
      { unit: "month", seconds: 60 * 60 * 24 * 30 },
      { unit: "year", seconds: 60 * 60 * 24 * 365 },
    ] as const;

    const match = units.find((entry, index) => {
      const next = units[index + 1];
      return absSeconds < (next ? next.seconds : Number.POSITIVE_INFINITY);
    });

    const unit = match?.unit ?? "year";
    const unitSeconds = match?.seconds ?? units[units.length - 1].seconds;
    const value = Math.round(deltaSeconds / unitSeconds);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    return formatter.format(value, unit);
  })();

  useEffect(() => {
    // Dynamically import to avoid SSR/build issues if these APIs aren't available in standard browser env
    // (though in Tauri they generally are, safe to use standard import if we are sure it's Tauri-only)
    // For now, simpler consistent usage:
    const win = getCurrentWindow();
    setAppWindow(win);

    const checkMaximized = async () => {
      setIsMaximized(await win.isMaximized());
    };

    checkMaximized();

    // Listen for resize events to update maximized state icon
    // Note: Tauri v2 event handling might differ, but checking state on click is a good fallback
    const unlisten = win.listen("tauri://resize", checkMaximized);

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = () => {
    if (appWindow) {
      appWindow.toggleMaximize();
      // Optimistically toggle state for immediate UI feedback,
      // though the listener should catch the actual state change.
      setIsMaximized(!isMaximized);
    }
  };
  const handleClose = () => appWindow?.close();

  const handleToggleTitles = async () => {
    if (!config) return;
    await saveConfig({
      ...config,
      view: {
        ...config.view,
        showPromptTitles: !config.view.showPromptTitles,
      },
    });
  };

  const handleToggleFullPrompt = async () => {
    if (!config) return;
    await saveConfig({
      ...config,
      view: {
        ...config.view,
        showFullPrompt: !config.view.showFullPrompt,
      },
    });
  };

  const handleToggleTags = async () => {
    if (!config) return;
    await saveConfig({
      ...config,
      view: {
        ...config.view,
        showPromptTags: !config.view.showPromptTags,
      },
    });
  };

  const handleToggleCreatedDate = async () => {
    if (!config) return;
    await saveConfig({
      ...config,
      view: {
        ...config.view,
        showCreatedDate: !config.view.showCreatedDate,
      },
    });
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 right-0 left-0 z-50 flex h-8 select-none items-center justify-between border-b border-panel-border bg-panel text-xs"
    >
      <div data-tauri-drag-region className="flex h-full flex-1 items-center gap-3 pl-4">
        <span
          data-tauri-drag-region
          className="pointer-events-none font-semibold opacity-70"
        >
          prompt-manager
        </span>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              data-tauri-drag-region="false"
              className="pointer-events-auto rounded-md px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              View
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              side="bottom"
              sideOffset={6}
              className="w-56 rounded-md border border-panel-border bg-panel p-2 shadow-lg"
            >
              <button
                type="button"
                onClick={handleToggleTitles}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span>Show Titles</span>
                <span className="text-neutral-500">
                  {config?.view?.showPromptTitles ? "On" : "Off"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleToggleFullPrompt}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span>Show Full Prompt</span>
                <span className="text-neutral-500">
                  {config?.view?.showFullPrompt ? "On" : "Off"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleToggleTags}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span>Show Tags</span>
                <span className="text-neutral-500">
                  {config?.view?.showPromptTags ? "On" : "Off"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleToggleCreatedDate}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span>Show Created Date</span>
                <span className="text-neutral-500">
                  {config?.view?.showCreatedDate ? "On" : "Off"}
                </span>
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div
          data-tauri-drag-region="false"
          className="group pointer-events-auto relative flex items-center gap-1 rounded-full border border-panel-border bg-panel-2 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500"
        >
          <FiDatabase />
          <span className="hidden sm:inline">vault</span>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-panel-border bg-panel p-2 text-[11px] text-neutral-600 opacity-0 shadow-lg transition group-hover:opacity-100 dark:text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-neutral-400">
                Last Sync
              </span>
              <span className="whitespace-nowrap text-neutral-700 dark:text-neutral-200">
                {lastSyncLabel}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-neutral-400">
                Prompts
              </span>
              <span className="text-neutral-700 dark:text-neutral-200">
                {prompts.length}
              </span>
            </div>
          </div>
        </div>
        <div
          data-tauri-drag-region="false"
          title={hasErrors ? `Console errors: ${errorCount}` : "No errors"}
          className={`h-2 w-2 rounded-full transition ${
            hasErrors ? "bg-red-400" : "bg-neutral-500/50"
          }`}
        />
        <div data-tauri-drag-region className="flex-1" />
      </div>

      {/* Window Controls */}
      <div className="flex h-full">
        <button
          type="button"
          data-tauri-drag-region="false"
          onClick={handleMinimize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          title="Minimize"
        >
          <VscChromeMinimize />
        </button>
        <button
          type="button"
          data-tauri-drag-region="false"
          onClick={handleMaximize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button
          type="button"
          data-tauri-drag-region="false"
          onClick={handleClose}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-red-500 hover:text-white"
          title="Close"
        >
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
}
