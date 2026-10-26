import { Cron, Interrupt, Thread } from "@langchain/langgraph-sdk";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { HITLRequest } from "@/components/thread/agent-inbox/types";

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
}

export function formatRelative(value?: string | null): string {
  const date = toDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

export function formatDateTime(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "PP p") : "—";
}

export function getCronTitle(cron: Cron): string {
  const title = cron.metadata?.title;
  if (typeof title === "string" && title.trim().length > 0) return title;
  return "Scheduled task";
}

export function getCronPrompt(cron: Cron): string {
  const input = cron.payload?.input;
  if (typeof input !== "object" || input === null) return "";
  const messages = (input as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return "";

  const content = (messages[0] as { content?: unknown } | undefined)?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string",
    )
    .map((block) => block.text)
    .join(" ");
}

export interface ReviewAction {
  name: string;
  description?: string;
}

export function getThreadReviewActions(thread: Thread): ReviewAction[] {
  const interrupts = Object.values(
    thread.interrupts ?? {},
  ).flat() as Interrupt<HITLRequest>[];

  const actions = interrupts.flatMap((interrupt) => {
    const requests = interrupt.value?.action_requests;
    if (!requests?.length) return [{ name: "Review required" }];
    return requests.map((request) => ({
      name: request.name,
      description: request.description,
    }));
  });

  return actions.length > 0 ? actions : [{ name: "Review required" }];
}
