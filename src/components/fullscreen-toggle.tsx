"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { TooltipIconButton } from "@/components/thread/tooltip-icon-button";
import { cn } from "@/lib/utils";

export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleChange();
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  useEffect(() => {
    const enterFullscreen = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Browsers require a user gesture before allowing fullscreen
      }
    };

    void enterFullscreen();

    const onFirstInteraction = (event: Event) => {
      removeListeners();
      if (buttonRef.current?.contains(event.target as Node)) return;
      void enterFullscreen();
    };
    const removeListeners = () => {
      document.removeEventListener("pointerdown", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
    };

    document.addEventListener("pointerdown", onFirstInteraction);
    document.addEventListener("keydown", onFirstInteraction);
    return removeListeners;
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen", error);
    }
  };

  return (
    <TooltipIconButton
      ref={buttonRef}
      tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      className={cn("size-8 p-1.5", className)}
      aria-pressed={isFullscreen}
      onClick={() => void toggleFullscreen()}
    >
      {isFullscreen ? (
        <Minimize2 className="size-5" />
      ) : (
        <Maximize2 className="size-5" />
      )}
    </TooltipIconButton>
  );
}
