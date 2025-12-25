import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => null,
  loader: () => {
    redirect({
      to: "/main_view",
      throw: true,
    });
  },
});
