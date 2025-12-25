import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { LuMoon, LuSun } from "react-icons/lu";
import "./CommandPalette.css";

export default function CommandPaletteComponent() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Handle Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="command-palette"
    >
      <Command.Input placeholder="Type a command or search..." autoFocus />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Appearance">
          <Command.Item
            onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark"
              ? <LuSun className="mr-2 h-4 w-4" />
              : <LuMoon className="mr-2 h-4 w-4" />}
            <span>Toggle Dark Mode</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
