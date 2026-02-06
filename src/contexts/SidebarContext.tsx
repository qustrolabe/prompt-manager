import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const value = useMemo(
    () => ({
      isOpen,
      toggle: () => setIsOpen((prev) => !prev),
      setOpen: (open: boolean) => setIsOpen(open),
    }),
    [isOpen],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
