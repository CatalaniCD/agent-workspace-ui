import { useCallback, useEffect, useMemo, useState } from "react";
import { Cron } from "@langchain/langgraph-sdk";
import {
  CalendarClock,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAgents } from "@/providers/Agents";
import { useThreads } from "@/providers/Thread";
import { toast } from "sonner";
import { CreateCronDialog, CronCreateInput } from "./create-cron-dialog";
import { formatRelative, getCronPrompt, getCronTitle } from "./utils";

export function CronsTab() {
  const { client } = useThreads();
  const { agents, agentsLoading, selectedAgentId } = useAgents();
  const [crons, setCrons] = useState<Cron[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () =>
      agents.find((agent) => agent.assistant_id === selectedAgentId) ??
      agents.find((agent) => agent.graph_id === selectedAgentId),
    [agents, selectedAgentId],
  );

  const assistantId =
    selectedAgent?.assistant_id ?? (agentsLoading ? "" : selectedAgentId);
  const assistantLabel =
    selectedAgent?.name ||
    selectedAgent?.graph_id ||
    selectedAgentId ||
    "Agent";

  const loadCrons = useCallback(async () => {
    if (!client || !assistantId) {
      setCrons([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextCrons = await client.crons.search({
        assistantId,
        limit: 100,
      });
      nextCrons.sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        const aNext = a.next_run_date
          ? new Date(a.next_run_date).getTime()
          : Number.POSITIVE_INFINITY;
        const bNext = b.next_run_date
          ? new Date(b.next_run_date).getTime()
          : Number.POSITIVE_INFINITY;
        return aNext - bNext;
      });
      setCrons(nextCrons);
    } catch (err) {
      console.error("Failed to load scheduled tasks", err);
      setError("Could not load scheduled tasks from this deployment.");
    } finally {
      setLoading(false);
    }
  }, [assistantId, client]);

  useEffect(() => {
    void loadCrons();
  }, [loadCrons]);

  const handleCreate = async (payload: CronCreateInput) => {
    if (!client || !assistantId) {
      throw new Error("Select an agent before creating a scheduled task.");
    }
    await client.crons.create(assistantId, payload);
    await loadCrons();
  };

  const handleToggle = async (cron: Cron, enabled: boolean) => {
    if (!client) return;

    setCrons((prev) =>
      prev.map((item) =>
        item.cron_id === cron.cron_id ? { ...item, enabled } : item,
      ),
    );

    try {
      const updated = await client.crons.update(cron.cron_id, { enabled });
      setCrons((prev) =>
        prev.map((item) => (item.cron_id === updated.cron_id ? updated : item)),
      );
      toast.success(
        enabled ? "Scheduled task enabled." : "Scheduled task paused.",
      );
    } catch (err) {
      console.error("Failed to update scheduled task", err);
      setCrons((prev) =>
        prev.map((item) =>
          item.cron_id === cron.cron_id
            ? { ...item, enabled: cron.enabled }
            : item,
        ),
      );
      toast.error("Failed to update the scheduled task.");
    }
  };

  const handleDelete = async (cronId: string) => {
    if (!client) return;

    setDeletingId(cronId);
    try {
      await client.crons.delete(cronId);
      setCrons((prev) => prev.filter((item) => item.cron_id !== cronId));
      setConfirmingDelete(null);
      toast.success("Scheduled task deleted.");
    } catch (err) {
      console.error("Failed to delete scheduled task", err);
      toast.error("Failed to delete the scheduled task.");
    } finally {
      setDeletingId(null);
    }
  };

  const enabledCount = crons.filter((cron) => cron.enabled).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Scheduled tasks</h2>
          <p className="text-muted-foreground text-sm">
            {crons.length > 0
              ? `${enabledCount} enabled · ${crons.length} total`
              : "Run this agent on a recurring schedule."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadCrons()}
            disabled={loading || !client || !assistantId}
            aria-label="Refresh scheduled tasks"
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!client || !assistantId}
          >
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>

      {!client || !assistantId ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Connect to a deployment and select an agent to manage scheduled tasks.
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-36 w-full rounded-lg"
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
            onClick={() => void loadCrons()}
          >
            Retry
          </Button>
        </div>
      ) : crons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <CalendarClock className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">No scheduled tasks yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Create one to run {assistantLabel} automatically.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create scheduled task
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {crons.map((cron) => {
            const prompt = getCronPrompt(cron);
            const isConfirming = confirmingDelete === cron.cron_id;
            const isDeleting = deletingId === cron.cron_id;

            return (
              <div
                key={cron.cron_id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                      <p className="truncate font-medium">
                        {getCronTitle(cron)}
                      </p>
                      {!cron.enabled && (
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                      {prompt || "No prompt configured."}
                    </p>
                    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                        {cron.schedule}
                      </code>
                      <span>{cron.timezone || "UTC"}</span>
                      <span>Next: {formatRelative(cron.next_run_date)}</span>
                      <span>
                        {cron.on_run_completed === "keep"
                          ? "Keeps thread"
                          : "Deletes thread"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={cron.enabled}
                      onCheckedChange={(enabled) =>
                        void handleToggle(cron, enabled)
                      }
                      aria-label={`Enable ${getCronTitle(cron)}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${getCronTitle(cron)}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setConfirmingDelete(isConfirming ? null : cron.cron_id)
                      }
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {isConfirming && (
                  <div className="bg-destructive/5 mt-3 flex flex-wrap items-center justify-end gap-2 rounded-md p-2">
                    <span className="text-muted-foreground mr-auto text-xs">
                      Delete this scheduled task?
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDelete(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDelete(cron.cron_id)}
                      disabled={isDeleting}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateCronDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        assistantLabel={assistantLabel}
        onCreate={handleCreate}
      />
    </div>
  );
}
