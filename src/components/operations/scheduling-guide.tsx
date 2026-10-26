"use client";

import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Globe2,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CRON_FIELDS = [
  { field: "Minute", values: "0–59", example: "0 or */15" },
  { field: "Hour", values: "0–23", example: "9" },
  { field: "Day of month", values: "1–31", example: "* or 1" },
  { field: "Month", values: "1–12", example: "*" },
  { field: "Day of week", values: "0–7 (0 and 7 are Sunday)", example: "1–5" },
];

const SCHEDULE_EXAMPLES = [
  { expression: "0 9 * * *", meaning: "Every day at 09:00" },
  { expression: "0 9 * * 1-5", meaning: "Weekdays at 09:00" },
  { expression: "0 * * * *", meaning: "Every hour on the hour" },
  { expression: "*/15 * * * *", meaning: "Every 15 minutes" },
  { expression: "30 17 * * 5", meaning: "Fridays at 17:30" },
  { expression: "0 9 1 * *", meaning: "The first day of each month at 09:00" },
];

const STEPS = [
  {
    title: "Select the agent",
    body: "Scheduled tasks belong to the agent selected in the workspace header. Switch agents before creating a task if needed.",
  },
  {
    title: "Open Operations → Scheduled",
    body: "Review the existing schedule so you do not create a duplicate. The “New task” button is in the top-right of the tab.",
  },
  {
    title: "Name the task",
    body: "Use a specific name such as “Weekday content review”. The name appears in the scheduled list and is easier to find than the prompt.",
  },
  {
    title: "Choose the schedule",
    body: "Enter a five-field cron expression or use a preset. The dialog offers Daily 9am, Weekdays 9am, and Every hour as starting points.",
  },
  {
    title: "Set the timezone",
    body: "The default is your browser timezone. Use an IANA name such as America/New_York or Europe/London so the schedule stays stable across environments.",
  },
  {
    title: "Write a self-contained prompt",
    body: "This prompt becomes the first human message of every run. Include the subject, scope, expected output, and any constraints the agent needs.",
  },
  {
    title: "Choose the finish behavior",
    body: "Keep thread on preserves run results for review in the Runs tab. Turning it off deletes the thread after the run, which saves history but removes the evidence.",
  },
  {
    title: "Create and verify",
    body: "Create the task, confirm it appears in Scheduled with the expected next run, then use the Runs tab to check the first execution.",
  },
];

export function SchedulingGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="How to schedule jobs"
        >
          <BookOpen className="size-4" />
          <span className="hidden sm:inline">How to schedule jobs</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            How to schedule jobs
          </DialogTitle>
          <DialogDescription>
            A short walkthrough for creating reliable recurring runs in this
            workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 text-sm">
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="text-muted-foreground size-4" />
              Walkthrough
            </h3>
            <ol className="flex flex-col gap-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3"
                >
                  <span className="bg-secondary text-secondary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarClock className="text-muted-foreground size-4" />
              Cron format
            </h3>
            <p className="text-muted-foreground">
              Use five space-separated fields: minute, hour, day of month,
              month, and day of week. There is no seconds field.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Field</th>
                    <th className="px-3 py-2 font-medium">Range</th>
                    <th className="px-3 py-2 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {CRON_FIELDS.map((field) => (
                    <tr
                      key={field.field}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{field.field}</td>
                      <td className="text-muted-foreground px-3 py-2">
                        {field.values}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {field.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Expression</th>
                    <th className="px-3 py-2 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_EXAMPLES.map((item) => (
                    <tr
                      key={item.expression}
                      className="border-t"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.expression}
                      </td>
                      <td className="text-muted-foreground px-3 py-2">
                        {item.meaning}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Globe2 className="text-muted-foreground size-4" />
              Timezone and end time
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              The schedule is interpreted in the timezone you enter, not in the
              server&apos;s timezone. The optional end time stops new runs after
              that moment; it does not delete the task. Use an explicit timezone
              for workflows that must run at a fixed local hour.
            </p>
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Lightbulb className="text-muted-foreground size-4" />
              Tips and common mistakes
            </h3>
            <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
              <li>Run the prompt manually once before scheduling it.</li>
              <li>
                Make prompts self-contained; the scheduled run has no chat
                context.
              </li>
              <li>
                Keep threads on for a first run so you can inspect the result.
              </li>
              <li>
                Pause a task instead of deleting it when you may need it again.
              </li>
              <li>Avoid schedules that can overlap long-running jobs.</li>
              <li>
                Use the Runs tab to confirm the first execution and its status.
              </li>
              <li>
                Check the cron field count; extra fields are a common failure.
              </li>
            </ul>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
