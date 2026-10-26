import { useEffect, useState } from "react";
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

interface CreateCronDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantLabel: string;
  onCreate: (payload: CronCreateInput) => Promise<void>;
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

export function CreateCronDialog({
  open,
  onOpenChange,
  assistantLabel,
  onCreate,
}: CreateCronDialogProps) {
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
    setTitle("");
    setSchedule("0 9 * * *");
    setTimezone(getDefaultTimezone());
    setPrompt("");
    setEndTime("");
    setKeepThread(true);
    setEnabled(true);
  }, [open]);

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
      await onCreate({
        schedule: schedule.trim(),
        timezone: timezone.trim() || undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        enabled,
        onRunCompleted: keepThread ? "keep" : "delete",
        metadata: title.trim() ? { title: title.trim() } : undefined,
        input: {
          messages: [{ type: "human", content: prompt.trim() }],
        },
      });
      toast.success("Scheduled task created.");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create scheduled task", error);
      toast.error("Failed to create scheduled task. Please try again.");
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
            New scheduled task
          </DialogTitle>
          <DialogDescription>
            Run <span className="font-medium">{assistantLabel}</span> on a cron
            schedule. The prompt is sent as the first human message of each run.
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
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
