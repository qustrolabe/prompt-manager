import { createRootRoute, Outlet } from "@tanstack/react-router";
import CommandPalette from "@/components/ui/CommandPalette.tsx";
import { RightSidebar } from "./main_view.tsx";
import { Sidebar as LeftSidebar } from "@/components/sidebar/Sidebar.tsx";
import { TitleBar } from "@/components/TitleBar.tsx";
import { PromptManagerProvider } from "@/contexts/PromptManagerContext.tsx";
import React from "react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <PromptManagerProvider>
        <CommandPalette />

        <TitleBar />

        <div className="flex h-screen flex-row pt-8">
          <LeftSidebar />
          <Outlet />
          <RightSidebar />
        </div>
      </PromptManagerProvider>
    </React.Fragment>
  );
}
