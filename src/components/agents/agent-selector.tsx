import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/providers/Agents";
import { cn } from "@/lib/utils";

export function AgentSelector() {
  const {
    agents,
    agentsLoading,
    agentsError,
    refreshAgents,
    selectAgent,
    selectedAgentId,
  } = useAgents();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return undefined;
    return (
      agents.find((agent) => agent.assistant_id === selectedAgentId) ??
      agents.find((agent) => agent.graph_id === selectedAgentId)
    );
  }, [agents, selectedAgentId]);

  const label =
    selectedAgent?.name ||
    selectedAgent?.graph_id ||
    selectedAgentId ||
    "Select agent";

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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-background max-w-[180px] gap-2 sm:max-w-[240px]"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {agentsLoading && agents.length === 0 ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Bot className="size-4" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label="Available agents"
          className="bg-popover text-popover-foreground absolute top-[calc(100%+6px)] left-0 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border shadow-lg"
        >
          <div className="bg-muted/50 flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium">Agents &amp; graphs</span>
              <span className="text-muted-foreground text-[11px]">
                {agents.length} available
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void refreshAgents()}
              disabled={agentsLoading}
              aria-label="Refresh agents"
            >
              <RefreshCw
                className={cn("size-3.5", agentsLoading && "animate-spin")}
              />
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto p-1">
            {agentsError && (
              <div className="px-3 py-4">
                <p className="text-muted-foreground text-sm">{agentsError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refreshAgents()}
                >
                  Retry
                </Button>
              </div>
            )}

            {!agentsError && agentsLoading && agents.length === 0 && (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
                <LoaderCircle className="size-4 animate-spin" />
                Loading agents...
              </div>
            )}

            {!agentsError && !agentsLoading && agents.length === 0 && (
              <p className="text-muted-foreground px-3 py-4 text-sm">
                No agents found on this deployment.
              </p>
            )}

            {agents.map((agent) => {
              const isSelected = selectedAgent
                ? agent.assistant_id === selectedAgent.assistant_id
                : agent.graph_id === selectedAgentId;

              return (
                <button
                  key={agent.assistant_id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    selectAgent(agent.assistant_id);
                    setOpen(false);
                  }}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left transition-colors",
                    isSelected && "bg-accent/70",
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {agent.name || agent.graph_id}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {agent.graph_id}
                      {agent.assistant_id !== agent.graph_id
                        ? ` · ${agent.assistant_id.slice(0, 8)}`
                        : ""}
                    </span>
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
