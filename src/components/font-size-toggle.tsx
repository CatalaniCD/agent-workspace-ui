"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Type } from "lucide-react";
import { TooltipIconButton } from "@/components/thread/tooltip-icon-button";
import { cn } from "@/lib/utils";

export const FONT_SIZE_STORAGE_KEY = "agent-workspace-font-size";
export const FONT_SIZE_EVENT = "agent-workspace:font-size";

export type FontSize = "small" | "default" | "large";

const FONT_SIZES: {
  value: FontSize;
  label: string;
  sampleClass: string;
}[] = [
  { value: "small", label: "Small", sampleClass: "text-sm" },
  { value: "default", label: "Default", sampleClass: "text-base" },
  { value: "large", label: "Large", sampleClass: "text-lg" },
];

function isFontSize(value: unknown): value is FontSize {
  return value === "small" || value === "default" || value === "large";
}

function readFontSize(): FontSize {
  if (typeof document === "undefined") return "default";

  const attribute = document.documentElement.dataset.fontSize;
  if (isFontSize(attribute)) return attribute;

  try {
    const stored = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (isFontSize(stored)) return stored;
  } catch {
    // localStorage can be unavailable in private or restricted contexts
  }

  return "default";
}

function writeFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size;

  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch {
    // Keep the in-memory preference even when persistence is unavailable
  }

  window.dispatchEvent(new CustomEvent(FONT_SIZE_EVENT, { detail: size }));
}

export function FontSizeToggle({
  className,
  menuAlign = "right",
  menuSide = "bottom",
}: {
  className?: string;
  menuAlign?: "left" | "right";
  menuSide?: "top" | "bottom";
}) {
  const [fontSize, setFontSize] = useState<FontSize>(() => readFontSize());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      setFontSize(isFontSize(next) ? next : readFontSize());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FONT_SIZE_STORAGE_KEY) return;
      const next = isFontSize(event.newValue) ? event.newValue : "default";
      document.documentElement.dataset.fontSize = next;
      setFontSize(next);
    };

    window.addEventListener(FONT_SIZE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(FONT_SIZE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <TooltipIconButton
        type="button"
        tooltip="Text size"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Type className="size-5" />
      </TooltipIconButton>

      {open && (
        <div
          role="menu"
          aria-label="Text size"
          className={cn(
            "bg-popover text-popover-foreground absolute z-50 w-44 overflow-hidden rounded-md border shadow-lg",
            menuSide === "top"
              ? "bottom-[calc(100%+6px)]"
              : "top-[calc(100%+6px)]",
            menuAlign === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium">
            Text size
          </div>
          <div className="p-1">
            {FONT_SIZES.map((option) => {
              const isSelected = fontSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    writeFontSize(option.value);
                    setFontSize(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left transition-colors",
                    isSelected && "bg-accent/70",
                  )}
                >
                  <span className="flex items-baseline gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("w-5 text-center", option.sampleClass)}
                    >
                      A
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </span>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
