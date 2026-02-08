import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";
import { Prompt, ViewConfig } from "@/schemas/schemas.ts";
import { ViewControls } from "@/components/ui/ViewControls.tsx";
import { PromptEditor } from "@/components/prompts/PromptEditor.tsx";
import { useViewManagement } from "@/hooks/useViewManagement.ts";
import { useOverlayState } from "@/hooks/useOverlayState.ts";
import { PromptList } from "@/components/prompts/PromptList.tsx";
import { useToast } from "@/components/ui/ToastProvider.tsx";
import { useViewHeader } from "@/contexts/ViewHeaderContext.tsx";
import { promptManagerService } from "@/services/PromptManagerService.ts";
import { useViewConfig } from "@/contexts/ViewConfigContext.tsx";

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
  const { header, setHeader } = useViewHeader();
  const { viewPrompts, setViewPrompts } = useViewConfig();
  const [showControls, setShowControls] = useState(true);

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

  const loadPrompts = useCallback(async (config: ViewConfig) => {
    try {
      const data = await promptManagerService.getPrompts({
        filter: config.filter,
        sort: config.sort,
      });
      setViewPrompts(data);
    } catch (error) {
      console.error("Failed to load filtered prompts", error);
      pushToast({
        title: "Failed to load prompts",
        description: error instanceof Error ? error.message : String(error),
        variant: "error",
      });
    }
  }, [pushToast]);

  // Overlay State Hooks
  const promptOverlay = useOverlayState<Prompt>();
  const [pinEditor, setPinEditor] = useState(false);
  const editContextSignatureRef = useRef<string | null>(null);

  const getContextSignature = useCallback(() => {
    return JSON.stringify({
      viewId: viewId ?? null,
      filter: currentConfig.filter ?? null,
      sort: currentConfig.sort ?? null,
    });
  }, [currentConfig.filter, currentConfig.sort, viewId]);

  const openEditInline = useCallback((prompt: Prompt) => {
    editContextSignatureRef.current = getContextSignature();
    setPinEditor(false);
    promptOverlay.openEdit(prompt);
  }, [getContextSignature, promptOverlay]);

  const openNewPrompt = useCallback(() => {
    editContextSignatureRef.current = getContextSignature();
    setPinEditor(true);
    promptOverlay.openNew();
  }, [getContextSignature, promptOverlay]);

  // Handlers for Save/Delete/Duplicate
  const handlePromptSave = async (p: Prompt) => {
    try {
      if (promptOverlay.isNew) await addPrompt(p);
      else await updatePrompt(p);
      await loadPrompts(currentConfig);
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

  const parentRef = useRef<HTMLDivElement>(null);

  const canRename = Boolean(activeView && activeView.type === "custom");
  const nextHeader = useMemo(
    () => ({
      title: getDisplayTitle(),
      canRename,
      isEditing: isEditingTitle,
      titleInput,
      setTitleInput,
      startEditing: canRename ? startEditingTitle : () => {},
      commitEditing: handleTitleBlur,
      toggleControls: () => setShowControls((prev) => !prev),
      controlsVisible: showControls,
    }),
    [
      canRename,
      getDisplayTitle,
      handleTitleBlur,
      isEditingTitle,
      setTitleInput,
      showControls,
      startEditingTitle,
      titleInput,
    ],
  );

  useEffect(() => {
    const isSame = header &&
      header.title === nextHeader.title &&
      header.canRename === nextHeader.canRename &&
      header.isEditing === nextHeader.isEditing &&
      header.titleInput === nextHeader.titleInput &&
      header.controlsVisible === nextHeader.controlsVisible;

    if (!isSame) {
      setHeader(nextHeader);
    }
  }, [header, nextHeader, setHeader]);

  useEffect(() => {
    return () => setHeader(null);
  }, [setHeader]);

  useEffect(() => {
    loadPrompts(currentConfig);
  }, [currentConfig, loadPrompts, prompts]);

  useEffect(() => {
    if (!promptOverlay.editingItem || promptOverlay.isNew || pinEditor) return;
    const signature = getContextSignature();
    if (
      editContextSignatureRef.current &&
      signature !== editContextSignatureRef.current
    ) {
      setPinEditor(true);
    }
  }, [getContextSignature, pinEditor, promptOverlay.editingItem, promptOverlay.isNew]);

  useEffect(() => {
    if (!promptOverlay.editingItem && !promptOverlay.isNew) {
      setPinEditor(false);
      editContextSignatureRef.current = null;
    }
  }, [promptOverlay.editingItem, promptOverlay.isNew]);

  const shouldPinEditor = pinEditor || promptOverlay.isNew;
  const pinnedPromptId = shouldPinEditor
    ? promptOverlay.editingItem?.id || null
    : null;
  const listPrompts = useMemo(() => {
    if (!pinnedPromptId) return viewPrompts;
    return viewPrompts.filter((prompt) => prompt.id !== pinnedPromptId);
  }, [pinnedPromptId, viewPrompts]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-main-background">
      {showControls && (
        <ViewControls
          config={currentConfig}
          onChange={handleConfigChange}
          allTags={allTags}
          onNewPrompt={openNewPrompt}
        />
      )}

      {/* Main Content List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl">
          {shouldPinEditor &&
            (promptOverlay.editingItem || promptOverlay.isNew) && (
            <div className="mb-4">
              <PromptEditor
                prompt={promptOverlay.editingItem}
                isNew={promptOverlay.isNew}
                allTags={allTags}
                initialTags={activeViewTags}
                onSave={handlePromptSave}
                onDelete={async (id) => {
                  await removePrompt(id);
                  await loadPrompts(currentConfig);
                  promptOverlay.close();
                }}
                onDuplicate={async (id) => {
                  await duplicatePrompt(id);
                  await loadPrompts(currentConfig);
                  promptOverlay.close();
                }}
                onClose={promptOverlay.close}
              />
            </div>
          )}
          <PromptList
            prompts={listPrompts}
            parentRef={parentRef}
            onEdit={openEditInline}
            onDelete={async (prompt) => {
              await removePrompt(prompt.id);
              await loadPrompts(currentConfig);
            }}
            renderPrompt={(prompt) => {
              if (
                !shouldPinEditor &&
                !promptOverlay.isNew &&
                promptOverlay.editingItem &&
                prompt.id === promptOverlay.editingItem.id
              ) {
                return (
                  <PromptEditor
                    prompt={promptOverlay.editingItem}
                    isNew={false}
                    allTags={allTags}
                    initialTags={activeViewTags}
                    onSave={handlePromptSave}
                    onDelete={async (id) => {
                      await removePrompt(id);
                      await loadPrompts(currentConfig);
                      promptOverlay.close();
                    }}
                    onDuplicate={async (id) => {
                      await duplicatePrompt(id);
                      await loadPrompts(currentConfig);
                      promptOverlay.close();
                    }}
                    onClose={promptOverlay.close}
                  />
                );
              }
              return null;
            }}
            showTitles={config?.view?.showPromptTitles ?? true}
            showFullPrompt={config?.view?.showFullPrompt ?? false}
            showTags={config?.view?.showPromptTags ?? true}
            showCreatedDate={config?.view?.showCreatedDate ?? true}
          />
        </div>
      </div>
    </div>
  );
}
