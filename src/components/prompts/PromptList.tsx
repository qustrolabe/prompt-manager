import { Prompt } from "@/schemas/schemas.ts";
import { PromptCard } from "./PromptCard.tsx";

interface PromptListProps {
  prompts: Prompt[];
  onEdit: (prompt: Prompt) => void;
}

export function PromptList({ prompts, onEdit }: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No prompts found matching current filters.
      </div>
    );
  }

  return (
    <>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onClick={() => onEdit(prompt)}
          onCopy={() => navigator.clipboard.writeText(prompt.text)}
        />
      ))}
    </>
  );
}
