import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { Activity, CalendarClock, ClipboardCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CronsTab } from "./crons-tab";
import { ReviewsTab } from "./reviews-tab";
import { RunsTab } from "./runs-tab";
import { SchedulingGuide } from "./scheduling-guide";

type OperationsTab = "scheduled" | "runs" | "reviews";

const TABS: Array<{
  value: OperationsTab;
  label: string;
  icon: typeof CalendarClock;
}> = [
  { value: "scheduled", label: "Scheduled", icon: CalendarClock },
  { value: "runs", label: "Runs", icon: Activity },
  { value: "reviews", label: "Reviews", icon: ClipboardCheck },
];

export function OperationsSheet() {
  const [open, setOpen] = useQueryState(
    "operationsOpen",
    parseAsBoolean.withDefault(false),
  );
  const [tabParam, setTabParam] = useQueryState(
    "operationsTab",
    parseAsString.withDefault("scheduled"),
  );
  const tab: OperationsTab = TABS.some((item) => item.value === tabParam)
    ? (tabParam as OperationsTab)
    : "scheduled";

  return (
    <Sheet
      open={!!open}
      onOpenChange={setOpen}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Operations
          </SheetTitle>
          <SheetDescription>
            Manage scheduled runs and review workflow activity for the selected
            agent.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex gap-1">
            {TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => void setTabParam(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === value
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <SchedulingGuide />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "scheduled" && <CronsTab />}
          {tab === "runs" && <RunsTab />}
          {tab === "reviews" && <ReviewsTab />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
