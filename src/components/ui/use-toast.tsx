"use client";

import * as React from "react";
import { createContext, useContext, useState } from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastContextType = {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Show a DNounce-styled message from anywhere (replaces the browser's alert() boxes).
 *   notify("Please choose a side.")                      -> neutral
 *   notify("Couldn't post that. Please try again.", "destructive") -> error
 */
export function notify(description: string, variant: Toast["variant"] = "default", title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("dnounce:toast", { detail: { description, variant, title } }));
}

/** Database/network errors are not shown raw; people see a plain sentence instead. */
export function friendlyError(e: any, fallback: string): string {
  const msg = String(e?.message ?? "").trim();
  if (!msg) return fallback;
  const technical = /violates|column|relation|constraint|jwt|pgrst|policy|syntax|null value|duplicate key|fetch|network|uuid|undefined|permission denied|rpc|function/i;
  return technical.test(msg) ? fallback : msg;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  React.useEffect(() => {
    const onToast = (ev: Event) => {
      const d = (ev as CustomEvent).detail ?? {};
      toast({ title: d.title, description: d.description, variant: d.variant });
    };
    window.addEventListener("dnounce:toast", onToast);
    return () => window.removeEventListener("dnounce:toast", onToast);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (props: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, ...props }]);
    setTimeout(() => dismiss(id), 5000); // auto dismiss after 5s
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}
