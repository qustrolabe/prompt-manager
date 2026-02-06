import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { Prompt, ViewConfig } from "@/schemas/schemas.ts";

type ViewConfigContextValue = {
  systemConfig: ViewConfig;
  setSystemConfig: (config: ViewConfig) => void;
  viewPrompts: Prompt[];
  setViewPrompts: (prompts: Prompt[]) => void;
};

const defaultSystemConfig: ViewConfig = {
  filter: {},
  sort: { by: "created", order: "desc" },
};

const ViewConfigContext = createContext<ViewConfigContextValue | undefined>(
  undefined,
);

export function ViewConfigProvider({ children }: { children: ReactNode }) {
  const [systemConfig, setSystemConfig] = useState<ViewConfig>(
    defaultSystemConfig,
  );
  const [viewPrompts, setViewPrompts] = useState<Prompt[]>([]);
  const value = useMemo(
    () => ({ systemConfig, setSystemConfig, viewPrompts, setViewPrompts }),
    [systemConfig, viewPrompts],
  );

  return (
    <ViewConfigContext.Provider value={value}>
      {children}
    </ViewConfigContext.Provider>
  );
}

export function useViewConfig() {
  const context = useContext(ViewConfigContext);
  if (!context) {
    throw new Error("useViewConfig must be used within ViewConfigProvider");
  }
  return context;
}
