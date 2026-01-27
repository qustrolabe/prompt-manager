import { createFileRoute, useSearch } from "@tanstack/react-router";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { Prompt, Snippet } from "@/schemas/schemas.ts";
import { ViewControls } from "@/components/ui/ViewControls.tsx";
import { PromptEditOverlay } from "@/components/prompts/PromptEditOverlay.tsx";
import { SnippetEditOverlay } from "@/components/snippets/SnippetEditOverlay.tsx";
import { usePromptFiltering } from "@/hooks/usePromptFiltering.ts";
import { useViewManagement } from "@/hooks/useViewManagement.ts";
import { useOverlayState } from "@/hooks/useOverlayState.ts";
import { PromptList } from "@/components/prompts/PromptList.tsx";
import { SnippetList } from "@/components/snippets/SnippetList.tsx";

// Define search params schema
interface MainViewSearch {
  viewId?: string;
  tab?: "snippets";
}

export const Route = createFileRoute("/main_view")({
  validateSearch: (search: Record<string, unknown>): MainViewSearch => {
    return {
      viewId: typeof search.viewId === "string" ? search.viewId : undefined,
      tab: search.tab === "snippets" ? "snippets" : undefined,
    };
  },
  component: MainViewComponent,
});

function MainViewComponent() {
  const { viewId, tab } = useSearch({ from: "/main_view" });
  const isSnippetsTab = tab === "snippets";

  const {
    prompts,
    snippets,
    views,
    allTags,
    updateView,
    addPrompt,
    updatePrompt,
    removePrompt,
    duplicatePrompt,
    addSnippet,
    updateSnippet,
    removeSnippet,
  } = usePromptManager();

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
  } = useViewManagement({ viewId, views, updateView, isSnippetsTab });

  // Prompt Filtering Hook
  const filteredPrompts = usePromptFiltering(prompts, currentConfig);

  // Overlay State Hooks
  const promptOverlay = useOverlayState<Prompt>();
  const snippetOverlay = useOverlayState<Snippet>();

  // Handlers for Save/Delete/Duplicate
  const handlePromptSave = async (p: Prompt) => {
    if (promptOverlay.isNew) await addPrompt(p);
    else await updatePrompt(p);
    promptOverlay.close();
  };

  const handleSnippetSave = async (s: Snippet) => {
    if (snippetOverlay.isNew) await addSnippet(s);
    else await updateSnippet(s);
    snippetOverlay.close();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTitleBlur();
  };

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

      {!isSnippetsTab && (
        <ViewControls
          config={currentConfig}
          onChange={handleConfigChange}
          allTags={allTags}
        />
      )}

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Create Actions */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() =>
                isSnippetsTab
                  ? snippetOverlay.openNew()
                  : promptOverlay.openNew()}
              className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200"
            >
              {isSnippetsTab ? "+ New Snippet" : "+ New Prompt"}
            </button>
          </div>

          {isSnippetsTab
            ? (
              <SnippetList
                snippets={snippets}
                onEdit={snippetOverlay.openEdit}
              />
            )
            : (
              <PromptList
                prompts={filteredPrompts}
                onEdit={promptOverlay.openEdit}
              />
            )}
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

      {(snippetOverlay.editingItem || snippetOverlay.isNew) && (
        <SnippetEditOverlay
          snippet={snippetOverlay.editingItem}
          isNew={snippetOverlay.isNew}
          allTags={allTags}
          onSave={handleSnippetSave}
          onDelete={async (id) => {
            await removeSnippet(id);
            snippetOverlay.close();
          }}
          onClose={snippetOverlay.close}
        />
      )}
    </div>
  );
}

// Deprecated export but kept to avoid breaking __root until updated if needed,
// though we updated __root to point to Sidebar.tsx, so this might be dead code soon.
// But RightSidebar is still used.
export function RightSidebar() {
  return (
    <div className="hidden w-64 shrink-0 border-l border-panel-border bg-panel p-2 lg:block">
      <div className="text-neutral-500 text-xs">
        Right Sidebar (Placeholder)
      </div>
    </div>
  );
}
