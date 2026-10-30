import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownText } from "@/components/thread/markdown-text";
import { useAgents } from "@/providers/Agents";
import { useThreads } from "@/providers/Thread";
import {
  formatNoteDate,
  getNoteDateKey,
  getNoteKey,
  getScratchpadGraphId,
  getScratchpadNamespace,
  parseScratchpadNotes,
  ScratchpadNote,
} from "@/lib/scratchpad";
import { cn } from "@/lib/utils";
import { formatRelative } from "./utils";

const TODAY = getNoteDateKey(new Date());

export function ScratchpadTab() {
  const { client } = useThreads();
  const { agents, agentsLoading, selectedAgentId } = useAgents();
  const graphId = useMemo(
    () => getScratchpadGraphId(agents, selectedAgentId),
    [agents, selectedAgentId],
  );

  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedKeyRef = useRef<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!client || !graphId) {
      setNotes([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await client.store.searchItems(
        getScratchpadNamespace(graphId),
        { limit: 100 },
      );
      const nextNotes = parseScratchpadNotes(result.items);
      setNotes(nextNotes);

      if (!selectedKeyRef.current && nextNotes.length > 0) {
        const latest = nextNotes[0];
        selectedKeyRef.current = latest.key;
        setSelectedKey(latest.key);
        setDateInput(latest.dateKey);
      }
    } catch (err) {
      console.error("Failed to load working notes", err);
      setError("Could not load working notes from this deployment.");
    } finally {
      setLoading(false);
    }
  }, [client, graphId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.key === selectedKey) ?? null,
    [notes, selectedKey],
  );

  const recentNotes = useMemo(() => notes.slice(0, 7), [notes]);

  const openLatest = () => {
    const latest = notes[0];
    if (!latest) return;
    selectedKeyRef.current = latest.key;
    setSelectedKey(latest.key);
    setDateInput(latest.dateKey);
  };

  const openDate = (dateKey: string) => {
    if (!dateKey) return;
    const key = getNoteKey(dateKey);
    selectedKeyRef.current = key;
    setDateInput(dateKey);
    setSelectedKey(key);
  };

  if (!client) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Connect to a deployment and select an agent to view the shared
        scratchpad.
      </div>
    );
  }

  if (!graphId && agentsLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  if (!graphId) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Select an agent to view the shared scratchpad.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Shared scratchpad</h2>
          <p className="text-muted-foreground text-sm">
            Read-only daily notes maintained by the agent at{" "}
            <code>/notes/YYYY-MM-DD.md</code>. Ask the agent to make changes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="date"
              aria-label="Select working note date"
              className="w-40 pl-8"
              value={dateInput}
              max={TODAY}
              onChange={(event) => openDate(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={openLatest}
            disabled={notes.length === 0}
          >
            Latest
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadNotes()}
            disabled={loading}
            aria-label="Refresh working notes"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {recentNotes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Recent</span>
          {recentNotes.map((note) => (
            <Button
              key={note.key}
              type="button"
              size="sm"
              variant={note.key === selectedKey ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => {
                selectedKeyRef.current = note.key;
                setSelectedKey(note.key);
                setDateInput(note.dateKey);
              }}
            >
              {format(parseISO(note.dateKey), "MMM d")}
            </Button>
          ))}
        </div>
      )}

      {loading && notes.length === 0 ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void loadNotes()}
          >
            Retry
          </Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <FileText className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">No working notes yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Ask the agent to record progress in{" "}
            <code>/notes/YYYY-MM-DD.md</code>.
          </p>
        </div>
      ) : selectedNote ? (
        <div className="rounded-lg border">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {formatNoteDate(selectedNote.dateKey)}
                </h3>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                  Read-only
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {selectedNote.updatedAt
                  ? `Updated ${formatRelative(selectedNote.updatedAt)}`
                  : "Update time unavailable"}
              </p>
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              {selectedNote.key}
            </span>
          </div>
          <div className="p-4">
            <MarkdownText>{selectedNote.content}</MarkdownText>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <FileText className="text-muted-foreground mx-auto size-8" />
          <p className="mt-3 font-medium">
            No notes for {formatNoteDate(dateInput)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            The agent has not recorded a working note for this day.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={openLatest}
          >
            <CalendarDays className="size-4" />
            Open latest note
          </Button>
        </div>
      )}
    </div>
  );
}
