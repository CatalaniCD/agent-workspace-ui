import { useEffect, useState } from "react";
import { Cron } from "@langchain/langgraph-sdk";
import { CalendarClock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCronPrompt } from "./utils";

export interface CronCreateInput {
  schedule: string;
  timezone?: string;
  endTime?: string;
  enabled?: boolean;
  onRunCompleted?: "delete" | "keep";
  metadata?: Record<string, unknown>;
  input: {
    messages: Array<{ type: "human"; content: string }>;
  };
}

export interface CronUpdateInput extends Omit<CronCreateInput, "endTime"> {
  endTime?: string | null;
}

interface CronDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantLabel: string;
  cron?: Cron | null;
  onCreate: (payload: CronCreateInput) => Promise<void>;
  onUpdate?: (cronId: string, payload: CronUpdateInput) => Promise<void>;
}

const SCHEDULE_PRESETS = [
  { label: "Daily 9am", value: "0 9 * * *" },
  { label: "Weekdays 9am", value: "0 9 * * 1-5" },
  { label: "Every hour", value: "0 * * * *" },
];

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function toLocalDateTimeValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildMetadata(
  cron: Cron | null | undefined,
  title: string,
): Record<string, unknown> | undefined {
  const metadata = { ...(cron?.metadata ?? {}) };
  const trimmed = title.trim();
  if (trimmed) {
    metadata.title = trimmed;
  } else {
    delete metadata.title;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function CronDialog({
  open,
  onOpenChange,
  assistantLabel,
  cron,
  onCreate,
  onUpdate,
}: CronDialogProps) {
  const isEditing = Boolean(cron);
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("0 9 * * *");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [prompt, setPrompt] = useState("");
  const [endTime, setEndTime] = useState("");
  const [keepThread, setKeepThread] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(
      typeof cron?.metadata?.title === "string" ? cron.metadata.title : "",
    );
    setSchedule(cron?.schedule ?? "0 9 * * *");
    setTimezone(cron?.timezone ?? getDefaultTimezone());
    setPrompt(cron ? getCronPrompt(cron) : "");
    setEndTime(toLocalDateTimeValue(cron?.end_time));
    setKeepThread(cron ? cron.on_run_completed !== "delete" : true);
    setEnabled(cron ? cron.enabled : true);
  }, [open, cron]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schedule.trim()) {
      toast.error("A cron schedule is required.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Add a prompt for the scheduled run.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CronCreateInput = {
        schedule: schedule.trim(),
        timezone: timezone.trim() || undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        enabled,
        onRunCompleted: keepThread ? "keep" : "delete",
        metadata: buildMetadata(cron, title),
        input: {
          messages: [{ type: "human", content: prompt.trim() }],
        },
      };

      if (cron && onUpdate) {
        await onUpdate(cron.cron_id, {
          ...payload,
          endTime: endTime ? new Date(endTime).toISOString() : null,
        });
        toast.success("Scheduled task updated.");
      } else {
        await onCreate(payload);
        toast.success("Scheduled task created.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error(
        isEditing
          ? "Failed to update scheduled task"
          : "Failed to create scheduled task",
        error,
      );
      toast.error(
        isEditing
          ? "Failed to update scheduled task. Please try again."
          : "Failed to create scheduled task. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            {isEditing ? "Edit scheduled task" : "New scheduled task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the schedule for " : "Run "}
            <span className="font-medium">{assistantLabel}</span>
            {isEditing
              ? ". The prompt is sent as the first human message of each run."
              : " on a cron schedule. The prompt is sent as the first human message of each run."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="cron-title">Name</Label>
            <Input
              id="cron-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Daily content review"
              maxLength={120}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cron-schedule">Cron schedule</Label>
              <Input
                id="cron-schedule"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
                placeholder="0 9 * * *"
                className="font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cron-timezone">Timezone</Label>
              <Input
                id="cron-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="UTC"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={schedule === preset.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSchedule(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cron-prompt">Prompt</Label>
            <Textarea
              id="cron-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Review the latest content and summarize what needs attention."
              className="min-h-24"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cron-end-time">End time (optional)</Label>
            <Input
              id="cron-end-time"
              type="datetime-local"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="cron-enabled">Enabled</Label>
                <p className="text-muted-foreground text-xs">
                  Start scheduling runs immediately.
                </p>
              </div>
              <Switch
                id="cron-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="cron-keep-thread">Keep thread after run</Label>
                <p className="text-muted-foreground text-xs">
                  Keeps run results available for review.
                </p>
              </div>
              <Switch
                id="cron-keep-thread"
                checked={keepThread}
                onCheckedChange={setKeepThread}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
