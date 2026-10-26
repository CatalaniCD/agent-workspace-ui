import { useCallback, useEffect, useMemo, useState } from "react";
import { Run, Thread } from "@langchain/langgraph-sdk";
import { Activity, RefreshCw } from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/providers/Agents";
import { useThreads } from "@/providers/Thread";
import { getThreadSearchMetadata, getThreadTitle } from "@/lib/threads";
import { cn } from "@/lib/utils";
import { formatRelative } from "./utils";

type RunStatus =
  "pending" | "running" | "error" | "success" | "timeout" | "interrupted";

interface RunWithThread {
  run: Run;
  thread: Thread;
}

type RunFilter = "all" | RunStatus;

const FILTERS: Array<{ label: string; value: RunFilter }> = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Success", value: "success" },
  { label: "Interrupted", value: "interrupted" },
  { label: "Error", value: "error" },
];

function statusDotClass(status: RunStatus): string {
  switch (status) {
    case "success":
      return "bg-emerald-500";
    case "error":
      return "bg-red-500";
    case "interrupted":
      return "bg-amber-500";
    case "timeout":
      return "bg-orange-500";
    case "pending":
    case "running":
      return "bg-blue-500";
    default:
      return "bg-gray-400";
  }
}

export function RunsTab() {
  const { client } = useThreads();
  const { selectedAgentId } = useAgents();
  const [, setThreadId] = useQueryState("threadId");
  const [, setOperationsOpen] = useQueryState(
    "operationsOpen",
    parseAsBoolean.withDefault(false),
  );
  const [runs, setRuns] = useState<RunWithThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RunFilter>("all");

  const loadRuns = useCallback(async () => {
    if (!client || !selectedAgentId) {
      setRuns([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const threads = await client.threads.search({
        metadata: getThreadSearchMetadata(selectedAgentId),
        limit: 12,
        sortBy: "updated_at",
        sortOrder: "desc",
      });

      const groups = await Promise.all(
        threads.map(async (thread) => {
          try {
            const threadRuns = await client.runs.list(thread.thread_id, {
              limit: 5,
            });
            return threadRuns.map((run) => ({ run, thread }));
          } catch (err) {
            console.error(
              "Failed to load runs for thread",
              thread.thread_id,
              err,
            );
            return [];
          }
        }),
      );

      const flattened = groups
        .flat()
        .sort(
          (a, b) =>
            new Date(b.run.created_at).getTime() -
            new Date(a.run.created_at).getTime(),
        );
      setRuns(flattened);
    } catch (err) {
      console.error("Failed to load recent runs", err);
      setError("Could not load recent runs from this deployment.");
    } finally {
      setLoading(false);
    }
  }, [client, selectedAgentId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const counts = useMemo(() => {
    const next: Partial<Record<RunStatus, number>> = {};
    for (const item of runs) {
      next[item.run.status] = (next[item.run.status] ?? 0) + 1;
    }
    return next;
  }, [runs]);

  const visibleRuns =
    filter === "all" ? runs : runs.filter((item) => item.run.status === filter);

  const openThread = (id: string) => {
    setThreadId(id);
    setOperationsOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Recent runs</h2>
          <p className="text-muted-foreground text-sm">
            Latest workflow activity across the 12 most recently updated
            threads.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void loadRuns()}
          disabled={loading || !client || !selectedAgentId}
          aria-label="Refresh runs"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => {
          const count =
            option.value === "all" ? runs.length : (counts[option.value] ?? 0);
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? "secondary" : "ghost"}
              onClick={() => setFilter(option.value)}
              className="gap-1.5"
            >
              {option.label}
              <span className="text-muted-foreground text-xs">{count}</span>
            </Button>
          );
        })}
      </div>

      {!client || !selectedAgentId ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Connect to a deployment and select an agent to view runs.
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-20 w-full rounded-lg"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void loadRuns()}
          >
            Retry
          </Button>
        </div>
      ) : visibleRuns.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Activity className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">No runs to show</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {runs.length === 0
              ? "Start a conversation or wait for a scheduled task to run."
              : "No runs match the selected status."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleRuns.map(({ run, thread }) => (
            <div
              key={`${thread.thread_id}-${run.run_id}`}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      statusDotClass(run.status),
                    )}
                  />
                  <span className="text-sm font-medium capitalize">
                    {run.status}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {run.run_id.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm">
                  {getThreadTitle(thread)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatRelative(run.created_at)} · thread{" "}
                  {thread.thread_id.slice(0, 8)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openThread(thread.thread_id)}
              >
                Open
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
