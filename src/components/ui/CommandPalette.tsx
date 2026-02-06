import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { useSidebar } from "@/contexts/SidebarContext.tsx";
import { LuMoon, LuSun } from "react-icons/lu";
import { Dialog } from "radix-ui";
import "./CommandPalette.css";

export default function CommandPaletteComponent() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();

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
      <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
      <Command.Input placeholder="Type a command or search..." autoFocus />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Appearance">
          <Command.Item
            onSelect={toggleTheme}
          >
            {theme === "dark"
              ? <LuSun className="mr-2 h-4 w-4" />
              : <LuMoon className="mr-2 h-4 w-4" />}
            <span>Toggle Theme</span>
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Layout">
          <Command.Item onSelect={toggleSidebar}>
            <span>Toggle Sidebar</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
