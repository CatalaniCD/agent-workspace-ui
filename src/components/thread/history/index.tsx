import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState } from "react";

import { getThreadTitle } from "@/lib/threads";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Check,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipIconButton } from "../tooltip-icon-button";
import { toast } from "sonner";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { renameThread, deleteThread } = useThreads();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
  const [deleting, setDeleting] = useState(false);

  const startEditing = (event: React.MouseEvent, thread: Thread) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingId(thread.thread_id);
    setDraft(getThreadTitle(thread));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft("");
  };

  const commitRename = async (thread: Thread) => {
    const title = draft.trim();
    if (!title) {
      toast.error("Thread name cannot be empty.");
      return;
    }

    if (title === getThreadTitle(thread)) {
      cancelEditing();
      return;
    }

    setSaving(true);
    try {
      await renameThread(thread.thread_id, title);
      toast.success("Thread renamed.");
      cancelEditing();
    } catch (error) {
      console.error("Failed to rename thread", error);
      toast.error("Failed to rename thread. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!threadToDelete) return;

    setDeleting(true);
    try {
      await deleteThread(threadToDelete.thread_id);
      if (editingId === threadToDelete.thread_id) cancelEditing();
      setThreadToDelete(null);
      toast.success("Conversation deleted.");
    } catch (error) {
      console.error("Failed to delete thread", error);
      toast.error("Failed to delete the conversation. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
        {threads.map((t) => {
          const itemText = getThreadTitle(t);
          const isEditing = editingId === t.thread_id;

          return (
            <div
              key={t.thread_id}
              className="group flex w-full items-center gap-1 px-1"
            >
              {isEditing ? (
                <form
                  className="flex w-full items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void commitRename(t);
                  }}
                >
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEditing();
                      }
                    }}
                    disabled={saving}
                    maxLength={120}
                    aria-label="Thread name"
                    className="h-9 min-w-0 flex-1"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    disabled={saving || !draft.trim()}
                    className="shrink-0"
                  >
                    <Check className="size-4" />
                    <span className="sr-only">Save thread name</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="shrink-0"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Cancel rename</span>
                  </Button>
                </form>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="min-w-0 flex-1 items-start justify-start text-left font-normal"
                    onClick={(e) => {
                      e.preventDefault();
                      onThreadClick?.(t.thread_id);
                      if (t.thread_id === threadId) return;
                      setThreadId(t.thread_id);
                    }}
                  >
                    <p className="truncate text-ellipsis">{itemText}</p>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Rename thread ${itemText}`}
                    className="size-8 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={(e) => startEditing(e, t)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete thread ${itemText}`}
                    className="text-muted-foreground hover:text-destructive size-8 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setThreadToDelete(t);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <Dialog
        open={!!threadToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setThreadToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              {threadToDelete
                ? `"${getThreadTitle(threadToDelete)}" and all of its messages will be permanently deleted.`
                : "This conversation and all of its messages will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setThreadToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-[280px]"
        />
      ))}
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [, setOperationsOpen] = useQueryState(
    "operationsOpen",
    parseAsBoolean.withDefault(false),
  );

  const { refreshThreads, threads, threadsLoading } = useThreads();

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  return (
    <>
      <div className="shadow-inner-right hidden h-screen w-[300px] shrink-0 flex-col items-start justify-start gap-6 border-r-[1px] border-slate-300 lg:flex">
        <div className="flex w-full items-center justify-between gap-2 px-4 pt-1.5">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              className="hover:bg-gray-100"
              variant="ghost"
              size="icon"
              onClick={() => setChatHistoryOpen((p) => !p)}
            >
              {chatHistoryOpen ? (
                <PanelRightOpen className="size-5" />
              ) : (
                <PanelRightClose className="size-5" />
              )}
              <span className="sr-only">Toggle thread history</span>
            </Button>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Threads
            </h1>
          </div>
          <TooltipIconButton
            tooltip="Operations"
            side="right"
            className="size-8 p-1.5"
            onClick={() => setOperationsOpen(true)}
          >
            <Activity className="size-4" />
          </TooltipIconButton>
        </div>
        {threadsLoading ? (
          <ThreadHistoryLoading />
        ) : (
          <ThreadList threads={threads} />
        )}
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex lg:hidden"
          >
            <SheetHeader className="flex-row items-center justify-between pr-10">
              <SheetTitle>Threads</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOperationsOpen(true);
                  setChatHistoryOpen(false);
                }}
              >
                <Activity className="size-4" />
                <span className="sr-only">Operations</span>
              </Button>
            </SheetHeader>
            <ThreadList
              threads={threads}
              onThreadClick={() => setChatHistoryOpen((o) => !o)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
