import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from "react-icons/vsc";

export function TitleBar() {
  const [appWindow, setAppWindow] = useState<
    Awaited<ReturnType<typeof getCurrentWindow>> | null
  >(null);
  const [isMaximized, setIsMaximized] = useState(false);

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

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 right-0 left-0 z-50 flex h-8 select-none items-center justify-between border-b border-panel-border bg-panel text-xs"
    >
      <div className="pointer-events-none flex h-full flex-1 items-center pl-4">
        <span className="font-semibold opacity-70">prompt-manager</span>
      </div>

      {/* Window Controls */}
      <div className="flex h-full">
        <button
          type="button"
          onClick={handleMinimize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          title="Minimize"
        >
          <VscChromeMinimize />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button
          type="button"
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
