import { createRootRoute, Outlet } from "@tanstack/react-router";
import CommandPalette from "@/components/ui/CommandPalette.tsx";
// import { RightSidebar } from "./main_view.tsx";
import { Sidebar as LeftSidebar } from "@/components/sidebar/Sidebar.tsx";
import { TitleBar } from "@/components/TitleBar.tsx";
import { PromptManagerProvider } from "@/contexts/PromptManagerContext.tsx";
import { SidebarProvider } from "@/contexts/SidebarContext.tsx";
import { ConsoleErrorProvider } from "@/contexts/ConsoleErrorContext.tsx";
import { ThemeProvider } from "@/contexts/ThemeContext.tsx";
import { ToastProvider } from "@/components/ui/ToastProvider.tsx";
import { ViewHeaderProvider } from "@/contexts/ViewHeaderContext.tsx";
import { ViewConfigProvider } from "@/contexts/ViewConfigContext.tsx";
import React from "react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <PromptManagerProvider>
        <ConsoleErrorProvider>
          <ThemeProvider>
            <SidebarProvider>
              <ViewConfigProvider>
                <ViewHeaderProvider>
                  <ToastProvider>
                    <CommandPalette />

                    <div className="flex h-screen flex-col overflow-hidden">
                      <TitleBar />
                      <div className="flex flex-1 flex-row overflow-hidden">
                        <LeftSidebar />
                        <div className="flex-1 overflow-hidden bg-main-background">
                          <Outlet />
                        </div>
                        {/* <RightSidebar /> */}
                      </div>
                    </div>
                  </ToastProvider>
                </ViewHeaderProvider>
              </ViewConfigProvider>
            </SidebarProvider>
          </ThemeProvider>
        </ConsoleErrorProvider>
      </PromptManagerProvider>
    </React.Fragment>
  );
}
