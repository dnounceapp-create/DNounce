"use client";

import { useToast } from "./use-toast";
import { X, AlertCircle, Info } from "lucide-react";

/** DNounce message banners (bottom-center on phones, bottom-right on larger screens). */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      className="fixed z-[100] bottom-4 left-4 right-4 sm:left-auto sm:right-4 flex flex-col gap-3 items-stretch sm:items-end pointer-events-none"
    >
      {toasts.map((toast) => {
        const error = toast.variant === "destructive";
        return (
          <div
            key={toast.id}
            role={error ? "alert" : "status"}
            className={`pointer-events-auto w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm rounded-2xl border shadow-lg px-4 py-3 text-sm bg-white ${
              error ? "border-red-200" : "border-gray-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="font-semibold text-gray-900 mb-0.5">{toast.title}</h4>}
                {toast.description && <p className="text-gray-700 leading-snug">{toast.description}</p>}
              </div>
              <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
