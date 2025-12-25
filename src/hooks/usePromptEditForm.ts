import { useEffect, useMemo, useState } from "react";
import { Prompt, PromptMode } from "@/schemas/schemas.ts";
import { parseTemplateKeywords } from "@/utils/templateUtils.ts";

interface UsePromptEditFormProps {
  prompt: Prompt | null;
  initialTags?: string[];
  isNew: boolean;
}

function areArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

function areObjectsEqual(a: Record<string, string>, b: Record<string, string>) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}

export function usePromptEditForm(
  { prompt, initialTags = [], isNew }: UsePromptEditFormProps,
) {
  const [title, setTitle] = useState(prompt?.title || "");
  const [text, setText] = useState(prompt?.text || "");
  const [description, setDescription] = useState(prompt?.description || "");
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [mode, setMode] = useState<PromptMode>(prompt?.mode || "raw");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    prompt?.templateValues || {},
  );

  // Parse keywords from text when in template mode
  const keywords = useMemo(() => {
    return mode === "template" ? parseTemplateKeywords(text) : [];
  }, [text, mode]);

  // Reset form when prompt changes
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title || "");
      setText(prompt.text || "");
      setDescription(prompt.description || "");
      setTags(prompt.tags);
      setMode(prompt.mode);
      setTemplateValues(prompt.templateValues || {});
    } else {
      setTitle("");
      setText("");
      setDescription("");
      setTags(initialTags || []);
      setMode("raw");
      setTemplateValues({});
    }
  }, [prompt?.id, isNew]);

  const isModified = useMemo(() => {
    if (prompt) {
      return (
        title !== (prompt.title || "") ||
        text !== prompt.text ||
        description !== (prompt.description || "") ||
        mode !== prompt.mode ||
        !areArraysEqual(tags, prompt.tags) ||
        !areObjectsEqual(templateValues, prompt.templateValues || {})
      );
    } else {
      return (
        title !== "" ||
        text !== "" ||
        description !== "" ||
        mode !== "raw" ||
        !areArraysEqual(tags, initialTags) ||
        Object.keys(templateValues).length > 0
      );
    }
  }, [
    prompt,
    title,
    text,
    description,
    tags,
    mode,
    templateValues,
    initialTags,
  ]);

  const handleKeywordChange = (keyword: string, value: string) => {
    setTemplateValues((prev) => ({
      ...prev,
      [keyword]: value,
    }));
  };

  return {
    title,
    setTitle,
    text,
    setText,
    description,
    setDescription,
    tags,
    setTags,
    mode,
    setMode,
    templateValues,
    setTemplateValues,
    keywords,
    isModified,
    handleKeywordChange,
  };
}
