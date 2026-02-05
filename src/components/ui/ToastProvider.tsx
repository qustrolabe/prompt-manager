import { createContext, useContext, useMemo, useState } from "react";
import { Toast } from "radix-ui";
import { FiX } from "react-icons/fi";

type ToastVariant = "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
};

type ToastInput = Omit<ToastItem, "id" | "open">;

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (toast: ToastInput) => {
    setToasts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        variant: toast.variant ?? "info",
        open: true,
        ...toast,
      },
    ]);
  };

  const value = useMemo(() => ({ pushToast }), []);

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider duration={5000}>
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            open={toast.open}
            className={`rounded-lg border px-4 py-3 shadow-lg transition ${
              toast.variant === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-panel-border bg-panel text-neutral-200"
            }`}
            onOpenChange={(open) => {
              setToasts((current) =>
                current.map((item) =>
                  item.id === toast.id ? { ...item, open } : item
                )
              );
              if (!open) {
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id)
                );
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Toast.Title className="text-sm font-semibold">
                  {toast.title}
                </Toast.Title>
                {toast.description && (
                  <Toast.Description className="mt-1 text-xs text-neutral-400">
                    {toast.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close asChild>
                <button
                  type="button"
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                >
                  <FiX size={14} />
                </button>
              </Toast.Close>
            </div>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 z-[200] flex w-80 flex-col gap-2" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
