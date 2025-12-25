import { SidebarLibrary } from "./SidebarLibrary.tsx";
import { SidebarViews } from "./SidebarViews.tsx";
import { SidebarFooter } from "./SidebarFooter.tsx";

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-panel-border border-r bg-panel text-sm transition-all duration-300">
      {/* Brand/Header */}
      <div className="flex h-14 items-center px-4 font-semibold text-neutral-900 dark:text-neutral-100">
        Prompt Manager
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <SidebarLibrary />
        <SidebarViews />
      </div>

      {/* Bottom panel */}
      <div className="border-panel-border border-t p-2">
        <SidebarFooter />
      </div>
    </div>
  );
}
