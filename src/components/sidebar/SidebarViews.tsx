import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { FiCheck, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { useMemo, useState } from "react";
import { View, ViewConfig } from "@/schemas/schemas.ts";
import { formatViewConfig } from "@/utils/viewUtils.ts";
import { useViewConfig } from "@/contexts/ViewConfigContext.tsx";

export function SidebarViews() {
  const { views, addView, removeView } = usePromptManager();
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const { systemConfig } = useViewConfig();

  const activeViewId = useMemo(() => {
    if (location.pathname !== "/main_view") return undefined;
    const params = new URLSearchParams(location.search);
    const raw = params.get("viewId");
    return raw || undefined;
  }, [location.pathname, location.search]);

  const activeConfig = useMemo<ViewConfig>(() => {
    if (activeViewId) {
      const found = views.find((view) => view.id === activeViewId);
      if (found) return found.config;
    }
    return systemConfig;
  }, [activeViewId, systemConfig, views]);

  const handleCreateView = async () => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const created = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${
      pad(
        now.getDate(),
      )
    }T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newView: View = {
      id: crypto.randomUUID(),
      name: "",
      type: "custom",
      config: activeConfig,
      created,
    };
    await addView(newView);
    await navigate({ to: "/main_view", search: { viewId: newView.id } });
  };

  const handleTrashClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingViewId(id);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await removeView(id);
    if (deletingViewId === id) {
      setDeletingViewId(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingViewId(null);
  };

  return (
    <div className="mb-6">
      <Link
        to="/main_view"
        className={activeViewId
          ? "mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          : "mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"}
      >
        All Prompts
      </Link>
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium uppercase text-neutral-500">
        <span>Views</span>
        <button
          type="button"
          onClick={handleCreateView}
          className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        >
          <FiPlus size={14} />
        </button>
      </div>

      <div className="space-y-1">
        {views.map((view) => (
          <Link
            key={view.id}
            to="/main_view"
            search={{ viewId: view.id }}
            className="group flex w-full items-center justify-between rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 [&.active]:bg-blue-50 [&.active]:text-blue-600 dark:[&.active]:bg-blue-900/20 dark:[&.active]:text-blue-400"
          >
            <span className="truncate">
              {view.name || formatViewConfig(view.config)}
            </span>

            {/* Delete button or Confirmation */}
            <div
              className={`transition-opacity ${
                deletingViewId === view.id
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {deletingViewId === view.id
                ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleConfirmDelete(e, view.id)}
                      className="rounded p-1 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
                      title="Confirm deletion"
                    >
                      <FiCheck size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCancelDelete(e)}
                      className="rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="Cancel"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                )
                : (
                  <button
                    type="button"
                    onClick={(e) => handleTrashClick(e, view.id)}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-neutral-700"
                    title="Delete view"
                  >
                    <FiTrash2 size={12} />
                  </button>
                )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
