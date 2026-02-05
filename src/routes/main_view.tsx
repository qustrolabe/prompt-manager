import { KeyboardEvent, useRef } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { Prompt } from "@/schemas/schemas.ts";
import { ViewControls } from "@/components/ui/ViewControls.tsx";
import { PromptEditOverlay } from "@/components/prompts/PromptEditOverlay.tsx";
import { usePromptFiltering } from "@/hooks/usePromptFiltering.ts";
import { useViewManagement } from "@/hooks/useViewManagement.ts";
import { useOverlayState } from "@/hooks/useOverlayState.ts";
import { PromptList } from "@/components/prompts/PromptList.tsx";
import { useToast } from "@/components/ui/ToastProvider.tsx";

// Define search params schema
interface MainViewSearch {
  viewId?: string;
}

export const Route = createFileRoute("/main_view")({
  validateSearch: (search: Record<string, unknown>): MainViewSearch => {
    return {
      viewId: typeof search.viewId === "string" ? search.viewId : undefined,
    };
  },
  component: MainViewComponent,
});

function MainViewComponent() {
  const { viewId } = useSearch({ from: "/main_view" });

  const {
    prompts,
    views,
    allTags,
    updateView,
    addPrompt,
    updatePrompt,
    removePrompt,
    duplicatePrompt,
    config,
  } = usePromptManager();
  const { pushToast } = useToast();

  // View Management Hook
  const {
    activeView,
    currentConfig,
    activeViewTags,
    handleConfigChange,
    getDisplayTitle,
    isEditingTitle,
    titleInput,
    setTitleInput,
    handleTitleBlur,
    startEditingTitle,
  } = useViewManagement({ viewId, views, updateView });

  // Prompt Filtering Hook
  const filteredPrompts = usePromptFiltering(prompts, currentConfig);

  // Overlay State Hooks
  const promptOverlay = useOverlayState<Prompt>();

  // Handlers for Save/Delete/Duplicate
  const handlePromptSave = async (p: Prompt) => {
    try {
      if (promptOverlay.isNew) await addPrompt(p);
      else await updatePrompt(p);
      promptOverlay.close();
    } catch (error) {
      console.error("Failed to save prompt", error);
      pushToast({
        title: "Failed to save prompt",
        description: error instanceof Error ? error.message : String(error),
        variant: "error",
      });
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleTitleBlur();
  };

  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-main-background">
      {/* View Header / Controls */}
      <div className="border-b border-panel-border bg-panel px-4 py-3">
        <div className="flex items-center gap-2">
          {activeView && isEditingTitle
            ? (
              <input
                autoFocus
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="border-b border-blue-500 bg-transparent font-semibold text-lg text-neutral-900 focus:outline-none dark:text-neutral-100"
              />
            )
            : (
              <h1
                className={`font-semibold text-lg text-neutral-900 dark:text-neutral-100 ${
                  activeView
                    ? "cursor-pointer hover:underline decoration-dotted"
                    : ""
                }`}
                onClick={startEditingTitle}
              >
                {getDisplayTitle()}
              </h1>
            )}
        </div>
      </div>

      <ViewControls
        config={currentConfig}
        onChange={handleConfigChange}
        allTags={allTags}
      />

      {/* Main Content List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl">
          {/* Create Actions */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => promptOverlay.openNew()}
              className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200"
            >
              + New Prompt
            </button>
          </div>

          <PromptList
            prompts={filteredPrompts}
            parentRef={parentRef}
            onEdit={promptOverlay.openEdit}
            onDelete={async (prompt) => {
              await removePrompt(prompt.id);
            }}
            showTitles={config?.view?.showPromptTitles ?? true}
            showFullPrompt={config?.view?.showFullPrompt ?? false}
            showTags={config?.view?.showPromptTags ?? true}
            showCreatedDate={config?.view?.showCreatedDate ?? true}
          />
        </div>
      </div>

      {/* Overlays */}
      {(promptOverlay.editingItem || promptOverlay.isNew) && (
        <PromptEditOverlay
          prompt={promptOverlay.editingItem}
          isNew={promptOverlay.isNew}
          allTags={allTags}
          initialTags={activeViewTags}
          onSave={handlePromptSave}
          onDelete={async (id) => {
            await removePrompt(id);
            promptOverlay.close();
          }}
          onDuplicate={async (id) => {
            await duplicatePrompt(id);
            promptOverlay.close();
          }}
          onClose={promptOverlay.close}
        />
      )}
    </div>
  );
}
