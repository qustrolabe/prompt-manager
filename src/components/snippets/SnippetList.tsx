import { Snippet } from "@/schemas/schemas.ts";
import { SnippetCard } from "./SnippetCard.tsx";

interface SnippetListProps {
  snippets: Snippet[];
  onEdit: (snippet: Snippet) => void;
}

export function SnippetList({ snippets, onEdit }: SnippetListProps) {
  return (
    <>
      {snippets.map((snippet) => (
        <SnippetCard
          key={snippet.id}
          snippet={snippet}
          onClick={() => onEdit(snippet)}
          onCopy={() => navigator.clipboard.writeText(snippet.value)}
        />
      ))}
    </>
  );
}
