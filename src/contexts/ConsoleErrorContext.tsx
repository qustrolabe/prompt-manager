import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ConsoleErrorState = {
  hasErrors: boolean;
  errorCount: number;
  clearErrors: () => void;
};

const ConsoleErrorContext = createContext<ConsoleErrorState | undefined>(
  undefined,
);

export function ConsoleErrorProvider(
  { children }: { children: React.ReactNode },
) {
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const originalError = console.error;

    console.error = (...args) => {
      setErrorCount((count) => count + 1);
      originalError(...args);
    };

    const handleGlobalError = () => {
      setErrorCount((count) => count + 1);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
    };
  }, []);

  const value = useMemo(() => {
    return {
      hasErrors: errorCount > 0,
      errorCount,
      clearErrors: () => setErrorCount(0),
    };
  }, [errorCount]);

  return (
    <ConsoleErrorContext.Provider value={value}>
      {children}
    </ConsoleErrorContext.Provider>
  );
}

export function useConsoleErrors() {
  const context = useContext(ConsoleErrorContext);
  if (!context) {
    throw new Error(
      "useConsoleErrors must be used within a ConsoleErrorProvider",
    );
  }
  return context;
}
