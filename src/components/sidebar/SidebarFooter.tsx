import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FiSettings } from "react-icons/fi";
import { Popover } from "radix-ui";
import { useTheme } from "@/contexts/ThemeContext.tsx";

export function SidebarFooter() {
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, 350);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        asChild
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex w-full cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <FiSettings size={16} />
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          side="top"
          sideOffset={10}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="w-48 overflow-hidden rounded-md border border-panel-border bg-panel shadow-lg"
        >
          <div className="flex flex-col p-1 text-sm">
            <Link
              to="/debug"
              className="rounded-sm px-2 py-1.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Debug
            </Link>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <span>Theme</span>
              <span className="capitalize text-neutral-500">{theme}</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
