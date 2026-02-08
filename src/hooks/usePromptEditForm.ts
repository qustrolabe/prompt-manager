import { useEffect, useMemo, useState } from "react";
import { Prompt } from "@/schemas/schemas.ts";

interface UsePromptEditFormProps {
  prompt: Prompt | null;
  initialTags?: string[];
  isNew: boolean;
  initialFilePath?: string;
}

function areArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

export function usePromptEditForm(
  { prompt, initialTags = [], isNew, initialFilePath = "" }:
    UsePromptEditFormProps,
) {
  const [text, setText] = useState(prompt?.text || "");
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [filePath, setFilePath] = useState(
    prompt?.filePath || initialFilePath,
  );
  const [title, setTitle] = useState<string>(prompt?.title || "");
  const [description, setDescription] = useState<string>(
    prompt?.description || "",
  );

  // Reset form when prompt changes
  useEffect(() => {
    if (prompt) {
      setText(prompt.text || "");
      setTags(prompt.tags);
      setFilePath(prompt.filePath || prompt.id || "");
      setTitle(prompt.title || "");
      setDescription(prompt.description || "");
    } else {
      setText("");
      setTags(initialTags || []);
      setFilePath(initialFilePath);
      setTitle("");
      setDescription("");
    }
  }, [prompt?.id, isNew, initialFilePath]);

  const isModified = useMemo(() => {
    if (prompt) {
      return (
        text !== prompt.text ||
        !areArraysEqual(tags, prompt.tags) ||
        (filePath || "") !== (prompt.filePath || "") ||
        (title || "") !== (prompt.title || "") ||
        (description || "") !== (prompt.description || "")
      );
    } else {
      return (
        text !== "" ||
        !areArraysEqual(tags, initialTags) ||
        (filePath || "") !== (initialFilePath || "") ||
        title !== "" ||
        description !== ""
      );
    }
  }, [
    prompt,
    text,
    tags,
    initialTags,
    filePath,
    initialFilePath,
    title,
    description,
  ]);

  return {
    text,
    setText,
    tags,
    setTags,
    filePath,
    setFilePath,
    title,
    setTitle,
    description,
    setDescription,
    isModified,
  };
}
