import { Link } from "@tanstack/react-router";
import { FiGrid, FiList } from "react-icons/fi";

export function SidebarLibrary() {
  return (
    <div className="mb-6">
      <div className="mb-2 px-2 text-xs font-medium text-neutral-500 uppercase">
        Library
      </div>
      <Link
        to="/main_view"
        activeOptions={{ exact: true }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 [&.active]:bg-blue-50 [&.active]:text-blue-600 dark:[&.active]:bg-blue-900/20 dark:[&.active]:text-blue-400"
      >
        <FiGrid />
        All Prompts
      </Link>
      <Link
        to="/main_view"
        search={{ tab: "snippets" }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 [&.active]:bg-blue-50 [&.active]:text-blue-600 dark:[&.active]:bg-blue-900/20 dark:[&.active]:text-blue-400"
      >
        <FiList />
        Snippets
      </Link>
    </div>
  );
}
