"use client";

import { useToast } from "./use-toast";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[250px] rounded-xl border shadow-md p-4 text-sm transition-all bg-white text-gray-800 ${
            toast.variant === "destructive"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              {toast.title && (
                <h4 className="font-semibold mb-0.5">{toast.title}</h4>
              )}
              {toast.description && (
                <p className="text-gray-600 text-xs">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
