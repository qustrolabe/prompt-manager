import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export type ViewHeaderState = {
  title: string;
  canRename: boolean;
  isEditing: boolean;
  titleInput: string;
  setTitleInput: (value: string) => void;
  startEditing: () => void;
  commitEditing: () => void;
  toggleControls: () => void;
  controlsVisible: boolean;
};

type ViewHeaderContextValue = {
  header: ViewHeaderState | null;
  setHeader: (header: ViewHeaderState | null) => void;
};

const ViewHeaderContext = createContext<ViewHeaderContextValue | undefined>(
  undefined,
);

export function ViewHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ViewHeaderState | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);

  return (
    <ViewHeaderContext.Provider value={value}>
      {children}
    </ViewHeaderContext.Provider>
  );
}

export function useViewHeader() {
  const context = useContext(ViewHeaderContext);
  if (!context) {
    throw new Error("useViewHeader must be used within ViewHeaderProvider");
  }
  return context;
}
