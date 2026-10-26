import { useCallback, useEffect, useState } from "react";
import { Thread } from "@langchain/langgraph-sdk";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/providers/Agents";
import { useThreads } from "@/providers/Thread";
import { getThreadSearchMetadata, getThreadTitle } from "@/lib/threads";
import { formatRelative, getThreadReviewActions } from "./utils";

export function ReviewsTab() {
  const { client } = useThreads();
  const { selectedAgentId } = useAgents();
  const [, setThreadId] = useQueryState("threadId");
  const [, setOperationsOpen] = useQueryState(
    "operationsOpen",
    parseAsBoolean.withDefault(false),
  );
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!client || !selectedAgentId) {
      setThreads([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextThreads = await client.threads.search({
        metadata: getThreadSearchMetadata(selectedAgentId),
        status: "interrupted",
        limit: 50,
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      setThreads(nextThreads);
    } catch (err) {
      console.error("Failed to load review queue", err);
      setError("Could not load the review queue from this deployment.");
    } finally {
      setLoading(false);
    }
  }, [client, selectedAgentId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const openThread = (id: string) => {
    setThreadId(id);
    setOperationsOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Review queue</h2>
          <p className="text-muted-foreground text-sm">
            Threads paused on a human-in-the-loop interrupt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {threads.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              {threads.length} pending
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadReviews()}
            disabled={loading || !client || !selectedAgentId}
            aria-label="Refresh review queue"
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      </div>

      {!client || !selectedAgentId ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Connect to a deployment and select an agent to review workflows.
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-28 w-full rounded-lg"
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
            onClick={() => void loadReviews()}
          >
            Retry
          </Button>
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ClipboardCheck className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">No pending reviews</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Interrupted workflows will appear here for approval.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {threads.map((thread) => {
            const actions = getThreadReviewActions(thread);
            return (
              <div
                key={thread.thread_id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {getThreadTitle(thread)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Updated {formatRelative(thread.updated_at)} · thread{" "}
                      {thread.thread_id.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openThread(thread.thread_id)}
                  >
                    Review
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {actions.map((action, index) => (
                    <div
                      key={`${thread.thread_id}-${action.name}-${index}`}
                      className="bg-muted/50 rounded-md px-3 py-2"
                    >
                      <p className="text-sm font-medium">{action.name}</p>
                      {action.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {action.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
