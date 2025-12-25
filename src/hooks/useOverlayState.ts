import { useState } from "react";

export function useOverlayState<T>() {
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setEditingItem(null);
    setIsNew(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setIsNew(false);
  };

  const close = () => {
    setEditingItem(null);
    setIsNew(false);
  };

  return {
    editingItem,
    isNew,
    openNew,
    openEdit,
    close,
  };
}
