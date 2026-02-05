import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePromptManager } from "@/contexts/PromptManagerContext.tsx";

type ThemeContextType = {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config, saveConfig } = usePromptManager();
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const configRef = useRef(config);
  const themeRef = useRef(theme);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const persistTheme = (next: "dark" | "light") => {
    const currentConfig = configRef.current;
    if (!currentConfig) return;
    const nextConfig = { ...currentConfig, theme: next };
    saveQueueRef.current = saveQueueRef.current
      .then(() => saveConfig(nextConfig))
      .catch((error) => {
        console.error("Failed to save theme", error);
      });
  };

  useEffect(() => {
    if (!config) return;
    const nextTheme = config.theme === "light" ? "light" : "dark";
    if (nextTheme !== themeRef.current) {
      setThemeState(nextTheme);
    }
    if (config.theme !== "dark" && config.theme !== "light") {
      persistTheme("dark");
    }
  }, [config]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark",
    );
  }, [theme]);

  const setTheme = (next: "dark" | "light") => {
    if (next === themeRef.current) return;
    setThemeState(next);
    persistTheme(next);
  };

  const toggleTheme = () => {
    const next = themeRef.current === "dark" ? "light" : "dark";
    setTheme(next);
  };

  // Provide theme context to children
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for easy theme access
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
