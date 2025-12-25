// MainControls.tsx
import React, { useRef, useState } from "react";
import { Popover } from "radix-ui";
import Panel from "@/components/Panel.tsx";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { Link, useLocation } from "@tanstack/react-router";

import { AiOutlineMenu } from "react-icons/ai";

function MenuOption({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const base =
    "w-full text-left select-none rounded-2xl p-2 hover:bg-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500";

  if (href) {
    return (
      <Link className={`${base} ${className}`} to={href}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${className}`}
    >
      {children}
    </button>
  );
}

export default function MainControls() {
  const { theme, setTheme } = useTheme();
  // const { pathname } = useLocation();

  // const isEditor = pathname.startsWith("/editor");

  // Calculate position class
  // If Editor:
  //   - Open: left-[17rem]
  //   - Closed: left-14 (to clear the open button)
  // If Not Editor:
  //   - left-2
  // const positionClass = isEditor ? "left-[17rem]" : "left-2";

  // State for visibility and "focus/lock" mode
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Timer ref to handle the gap between trigger and content
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const closeMenu = () => {
    // Only close if not locked
    if (isLocked) return;

    // Add a small delay so user can move mouse from trigger to content
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 350);
  };

  const toggleLock = () => {
    if (isLocked) {
      // If currently locked, clicking again closes it
      setIsLocked(false);
      setIsOpen(false);
    } else {
      // If not locked (even if hovering), lock it open
      setIsLocked(true);
      setIsOpen(true);
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-2 left-2 z-50">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          // This handles clicking outside (Radix 'interactOutside')
          if (!open) {
            setIsOpen(false);
            setIsLocked(false);
          }
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-4xl border border-panel-border bg-panel hover:brightness-150 ${
              isLocked ? "ring-2 ring-neutral-500 brightness-150" : ""
            }`}
            // Event Handlers
            onMouseEnter={openMenu}
            onMouseLeave={closeMenu}
            onClick={(e) => {
              e.preventDefault(); // Prevent default Radix toggle behavior
              toggleLock();
            }}
          >
            <AiOutlineMenu />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="end"
            side="right"
            sideOffset={10}
            alignOffset={100}
            // Important: Handle mouse events on the Content too
            // so it doesn't close while interacting with the menu
            onMouseEnter={openMenu}
            onMouseLeave={closeMenu}
            // Prevent auto-focus stealing unless locked
            onOpenAutoFocus={(e) => {
              if (!isLocked) e.preventDefault();
            }}
          >
            <Panel>
              <div className="flex w-60 flex-col">
                <div className="rounded-xl border border-panel-border bg-panel-2 p-1">
                  <div className="flex h-10 w-full items-center justify-center">
                    USER USER USER
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-1">
                  <MenuOption
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    Toggle Theme: {theme}
                  </MenuOption>
                  <hr />
                  <MenuOption href="/">Root</MenuOption>
                  <MenuOption href="/editor">Editor</MenuOption>
                  <MenuOption href="/testing_gallery">
                    Testing Gallery
                  </MenuOption>
                  <MenuOption href="/prompt_manager">
                    Prompt Manager
                  </MenuOption>
                  <MenuOption href="/debug">
                    Debug
                  </MenuOption>
                  <hr />
                </div>
              </div>
            </Panel>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
