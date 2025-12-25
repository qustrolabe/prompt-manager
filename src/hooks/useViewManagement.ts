import { useEffect, useMemo, useState } from "react";
import { View, ViewConfig } from "@/schemas/schemas.ts";
import { formatViewConfig } from "@/utils/viewUtils.ts";

interface UseViewManagementProps {
  viewId?: string;
  views: View[];
  updateView: (view: View) => Promise<void>;
  isSnippetsTab: boolean;
}

export function useViewManagement({
  viewId,
  views,
  updateView,
  isSnippetsTab,
}: UseViewManagementProps) {
  // Local state for system view config (ephemeral)
  const [systemConfig, setSystemConfig] = useState<ViewConfig>({
    filter: {},
    sort: { by: "created_at", order: "desc" },
  });

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  // Determine current active config
  const activeView = useMemo(
    () => (viewId ? views.find((v) => v.id === viewId) : null),
    [viewId, views],
  );

  // Sync title input when active view changes
  useEffect(() => {
    if (activeView) {
      setTitleInput(activeView.name);
    }
  }, [activeView]);

  const activeViewTags = useMemo(() => {
    if (!activeView?.config?.filter?.tags) return undefined;
    return activeView.config.filter.tags.filter((t) => !t.startsWith("-"));
  }, [activeView]);

  const currentConfig = activeView ? activeView.config : systemConfig;

  // Handle configuration changes
  const handleConfigChange = async (newConfig: ViewConfig) => {
    if (activeView) {
      await updateView({
        ...activeView,
        config: newConfig,
      });
    } else {
      setSystemConfig(newConfig);
    }
  };

  const getDisplayTitle = () => {
    if (isSnippetsTab) return "Snippets";
    if (activeView) {
      if (activeView.name && activeView.name.trim() !== "") {
        return activeView.name;
      }
      return formatViewConfig(activeView.config);
    }
    return "All Prompts";
  };

  const handleTitleBlur = async () => {
    if (activeView && titleInput !== activeView.name) {
      await updateView({
        ...activeView,
        name: titleInput,
      });
    }
    setIsEditingTitle(false);
  };

  const startEditingTitle = () => {
    if (activeView) {
      setTitleInput(activeView.name);
      setIsEditingTitle(true);
    }
  };

  return {
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
    setIsEditingTitle,
  };
}
